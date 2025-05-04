const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const OnlineOrder = require("../../schemas/finance/onlineOrders");
const { validate } = require("../../middleware/validateMiddleware");
const onlineOrderValidationSchema = require("../../validation/onlineOrdersJoi");
const Product = require("../../schemas/product");
const OnlineSale = require("../../schemas/finance/onlineSales");
const FinanceOverview = require("../../schemas/finance/financeOverview");

router.get("/", async (req, res) => {
  try {
    console.log("🔍 Fetching online orders...");

    // Фільтр за статусом
    const filter = req.query.status
      ? { status: req.query.status }
      : { status: { $ne: "archived" } };

    // Пагінація (наприклад, ?page=1&limit=10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Отримання замовлень з фільтром
    const onlineOrders = await OnlineOrder.find(filter)
      .populate("products.productId")
      .populate("userId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log("✅ onlineOrders fetched:", onlineOrders);
    if (!onlineOrders || onlineOrders.length === 0) {
      console.warn("⚠️ No online orders found.");
      return res.status(404).json({ error: "No online orders available" });
    }
    res.status(200).json({ onlineOrders, page, limit });
  } catch (error) {
    console.error("Error in fetching online orders:", error);
    res.status(500).json({ error: "Failed to fetch online orders" });
  }
});

// Створити нове онлайн замовлення
router.post("/", validate(onlineOrderValidationSchema), async (req, res) => {
  try {
    console.log("➡️ Received request for online order.");
    console.log("Request Body:", req.body);

    const {
      products,
      totalQuantity,
      totalPrice,
      paymentMethod,
      paymentStatus,
      userId,
    } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ error: "Product list cannot be empty." });
    }

    const newOnlineOrder = new OnlineOrder({
      products,
      totalQuantity,
      totalPrice,
      paymentMethod,
      userId,
      paymentStatus,
      status: "new",
    });

    await newOnlineOrder.save();
    res.status(201).json({
      message: "Online order created successfully",
      order: newOnlineOrder,
    });
  } catch (error) {
    console.error("Error in creating online order:", error);
    res.status(500).json({ error: "Failed to create online order" });
  }
});

// Отримати конкретне онлайн замовлення
router.get("/:id", async (req, res) => {
  try {
    const onlineOrder = await OnlineOrder.findById(req.params.id)
      .populate("products.productId")
      .populate("userId");
    if (!onlineOrder) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.status(200).json(onlineOrder);
  } catch (error) {
    console.error("Error in fetching order:", error);
    res.status(500).json({ error: "Failed to fetch online order" });
  }
});

// Оновити статус онлайн замовлення
router.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["new", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updatedOnlineOrder = await OnlineOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updatedOnlineOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({
      message: "Online order updated successfully",
      order: updatedOnlineOrder,
    });
  } catch (error) {
    console.error("Error in updating order:", error);
    res.status(500).json({ error: "Failed to update online order" });
  }
});

module.exports = router;
