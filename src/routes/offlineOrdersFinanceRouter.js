const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const OfflineOrder = require("../schemas/finance/offlineOrders");
const { validate } = require("../middleware/validateMiddleware");
const offlineOrderValidationSchema = require("../validation/offlineOrdersJoi");
const Product = require("../schemas/product");
const offlineSaleValidationSchema = require("../validation/offlineSalesJoi");
const OfflineSale = require("../schemas/finance/offlineSales");
const FinanceOverview = require("../schemas/finance/financeOverview");
const FinanceSettings = require("../schemas/financeSettings");
router.get("/", async (req, res) => {
  try {
    console.log("🔍 Fetching offline orders...");

    // Фільтр за статусом
    const filter = req.query.status
      ? { status: req.query.status }
      : { status: { $ne: "archived" } };

    // Пагінація (наприклад, ?page=1&limit=10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Отримання замовлень з фільтром
    const orders = await OfflineOrder.find(filter)
      .populate("products.productId", "name photoUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log("✅ Orders fetched:", orders);

    if (!orders || orders.length === 0) {
      console.warn("⚠️ No offline orders found.");
      return res.status(404).json({ error: "No offline orders available" });
    }

    res.status(200).json({ orders, page, limit });
  } catch (error) {
    console.error("🔥 Error fetching offline orders:", error);
    res.status(500).json({ error: "Failed to fetch offline orders" });
  }
});

router.post("/", validate(offlineOrderValidationSchema), async (req, res) => {
  try {
    console.log("➡️ Received request for offline order.");
    console.log("Request Body:", req.body);

    const { products, totalPrice, paymentMethod, paymentStatus } = req.body;
    console.log("✅ Extracted request data.");

    const orderProducts = [];

    for (const product of products) {
      console.log(`🔎 Checking product: ${product.productId}`);
      const dbProduct = await Product.findById(product.productId);

      if (!dbProduct) {
        console.error(`❌ Product not found: ${product.productId}`);
        return res
          .status(400)
          .json({ error: `Product not found: ${product.productId}` });
      }

      if (dbProduct.quantity < product.quantity) {
        console.error(
          `⚠️ Insufficient stock for: ${dbProduct.name}. Available: ${dbProduct.quantity}, Requested: ${product.quantity}`
        );
        return res.status(400).json({
          error: `Insufficient stock for product: ${dbProduct.name}`,
        });
      }

      console.log(
        `✔️ Product ${dbProduct.name} is available. Updating stock...`
      );
      dbProduct.quantity -= product.quantity;
      await dbProduct.save();
      console.log(
        `✔️ Updated stock for ${dbProduct.name}. New quantity: ${dbProduct.quantity}`
      );

      orderProducts.push({
        productId: dbProduct._id,
        name: dbProduct.name,
        price: dbProduct.price,
        quantity: product.quantity,
        photoUrl: dbProduct.photoUrl,
      });
    }

    console.log("📦 Preparing new order object...");
    const newOrder = new OfflineOrder({
      products: orderProducts,
      totalPrice,
      paymentMethod,
      paymentStatus: paymentStatus || "pending", // ✅ Додаємо paymentStatus
      status: "pending",
    });

    console.log("📦 New OfflineOrder (before save):", newOrder);
    await newOrder.save();
    console.log("✅ Offline order created successfully!");

    // ✅ Якщо замовлення оплачено, додаємо його до FinanceOverview
    if (paymentStatus === "paid") {
      console.log("📊 Payment confirmed. Adding order to FinanceOverview...");

      let overview = await FinanceOverview.findOne({});
      if (!overview) {
        console.log("⚠️ No FinanceOverview found, creating a new one...");
        overview = new FinanceOverview({
          completedOrders: [],
          totalRevenue: 0,
        });
        await overview.save();
      }

      console.log("🔍 Adding order ID:", newOrder._id);
      await FinanceOverview.updateOne(
        {},
        { $push: { completedOrders: newOrder._id } },
        { upsert: true }
      );

      console.log("✅ Order added to FinanceOverview!");
    }

    res.status(201).json({
      message: "Offline order created successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("🔥 Error creating offline order:", error);
    res.status(500).json({ error: "Failed to create offline order" });
  }
});

// Отримати конкретне офлайн-замовлення
router.get("/:id", async (req, res) => {
  try {
    console.log(`🔎 Fetching order with ID: ${req.params.id}`);

    const order = await OfflineOrder.findById(req.params.id).populate(
      "products.productId",
      "name photoUrl"
    );

    if (!order) {
      console.warn(`⚠️ Order not found for ID: ${req.params.id}`);
      return res.status(404).json({ error: "Offline order not found" });
    }

    console.log("✅ Order fetched:", order);
    res.status(200).json(order);
  } catch (error) {
    console.error("🔥 Error fetching offline order:", error);
    res.status(500).json({ error: "Failed to fetch offline order" });
  }
});

// Оновити статус офлайн-замовлення
router.patch("/:id", async (req, res) => {
  try {
    console.log(
      `🛠 Updating order ID: ${req.params.id} with status: ${req.body.status}`
    );

    const { status } = req.body;
    const validStatuses = ["pending", "completed", "cancelled"];

    if (!validStatuses.includes(status)) {
      console.warn(`⚠️ Invalid status received: ${status}`);
      return res.status(400).json({ error: "Invalid status" });
    }

    const existingOrder = await OfflineOrder.findById(req.params.id);
    if (!existingOrder) {
      console.warn(`⚠️ Order not found for ID: ${req.params.id}`);
      return res.status(404).json({ error: "Offline order not found" });
    }

    if (existingOrder.status === status) {
      console.warn(`⚠️ Status is already '${status}', no update needed.`);
      return res.status(400).json({ error: "Order already has this status" });
    }

    existingOrder.status = status;
    await existingOrder.save();

    console.log("✅ Offline order status updated successfully!");

    // 📌 Якщо замовлення оплачено і завершено, додаємо його у `OfflineSales`
    console.log("🔍 Checking order status for OfflineSale creation");
    if (status === "completed") {
      console.log("📊 Payment confirmed. Adding order to OfflineSales...");

      const newSale = new OfflineSale({
        orderId: existingOrder._id,
        totalAmount: existingOrder.totalPrice,
        paymentMethod: existingOrder.paymentMethod,
        products: existingOrder.products,
        saleDate: new Date(),
      });

      console.log("📦 New OfflineSale (before save):", newSale);
      await newSale.save();
      console.log("✅ Sale saved successfully!");

      await OfflineOrder.updateOne({ _id: order._id }, { status: "archived" });

      console.log("🔍 Adding order ID:", existingOrder._id);
      await FinanceOverview.updateOne(
        {},
        {
          $push: { completedOrders: existingOrder._id },
          $inc: { totalRevenue: existingOrder.totalPrice },
        },
        { upsert: true }
      );

      console.log("✅ Order added to FinanceOverview!");
    }

    res.status(200).json({
      message: "Offline order updated successfully",
      order: existingOrder,
    });
  } catch (error) {
    console.error("🔥 Error updating offline order:", error);
    res.status(500).json({ error: "Failed to update offline order" });
  }
});

module.exports = router;
