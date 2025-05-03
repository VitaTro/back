const express = require("express");
const router = express.Router();
const OnlineOrder = require("../../schemas/finance/onlineOrders");

const { validate } = require("../../middleware/validateMiddleware");

const validateOnlineOrder = require("../../validation/onlineOrdersJoi");
router.get("/", async (req, res) => {
  try {
    const orders = await OnlineOrder.find()
      .populate("products.productId")
      .populate("userId");
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error in fetching online orders:", error);
    res.status(500).json({ error: "Failed to fetch online orders" });
  }
});

// Створити нове онлайн замовлення
router.post("/", validate(validateOnlineOrder), async (req, res) => {
  try {
    const { products, totalQuantity, totalPrice, paymentMethod, userId } =
      req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ error: "Product list cannot be empty." });
    }

    const newOrder = new OnlineOrder({
      products,
      totalQuantity,
      totalPrice,
      paymentMethod,
      userId,
      status: "new",
    });

    await newOrder.save();
    res
      .status(201)
      .json({ message: "Online order created successfully", order: newOrder });
  } catch (error) {
    console.error("Error in creating online order:", error);
    res.status(500).json({ error: "Failed to create online order" });
  }
});

// Отримати конкретне онлайн замовлення
router.get("/:id", async (req, res) => {
  try {
    const order = await OnlineOrder.findById(req.params.id)
      .populate("products.productId")
      .populate("userId");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.status(200).json(order);
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

    const updatedOrder = await OnlineOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({
      message: "Online order updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error in updating order:", error);
    res.status(500).json({ error: "Failed to update online order" });
  }
});

module.exports = router;
