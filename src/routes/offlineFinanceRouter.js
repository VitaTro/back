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
router.get("/orders", async (req, res) => {
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

router.post(
  "/orders",
  validate(offlineOrderValidationSchema),
  async (req, res) => {
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
  }
);

// Отримати конкретне офлайн-замовлення
router.get("/orders/:id", async (req, res) => {
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
router.patch("/orders/:id", async (req, res) => {
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

// Отримати всі офлайн-продажі
router.get("/sales", async (req, res) => {
  try {
    console.log("🔍 Fetching offline sales...");

    // const { status } = req.query; // Додаємо фільтрацію за статусом
    // const filter = status ? { status } : { status: "completed" };
    const filter = req.query.status ? { status: req.query.status } : {};
    const sales = await OfflineSale.find(filter).populate(
      "products.productId",
      "name photoUrl price"
    );

    if (!sales || sales.length === 0) {
      console.warn("⚠️ No  sales found.");
      return res.status(404).json({ error: "No offline sales available" });
    }

    console.log("✅ offline sales fetched:", sales);
    res.status(200).json(sales);
  } catch (error) {
    console.error("🔥 Error fetching offline sales:", error);
    res.status(500).json({ error: "Failed to fetch offline sales" });
  }
});

router.post(
  "/sales",
  validate(offlineSaleValidationSchema),
  async (req, res) => {
    try {
      const { products, totalAmount, paymentMethod, status } = req.body;

      const saleProducts = [];
      for (const product of products) {
        const dbProduct = await Product.findById(product.productId);
        if (!dbProduct || dbProduct.quantity < product.quantity) {
          return res.status(400).json({
            error: `Insufficient stock for product: ${
              dbProduct?.name || product.productId
            }`,
          });
        }
        dbProduct.quantity -= product.quantity;
        await dbProduct.save();

        saleProducts.push({
          productId: dbProduct._id,
          quantity: product.quantity,
          price: dbProduct.price,
          photoUrl: dbProduct.photoUrl,
        });
      }

      const newSale = new OfflineSale({
        products: saleProducts,
        totalAmount,
        paymentMethod,
        status: status || (paymentMethod !== "cash" ? "completed" : "pending"),
        saleDate: new Date(),
      });

      await newSale.save();
      console.log("✅ Sale recorded successfully!");
      if (newSale.status === "completed") {
        await FinanceOverview.updateOne(
          {},
          {
            $inc: { totalRevenue: newSale.totalAmount },
            $push: { completedSales: newSale._id },
          },
          { upsert: true }
        );
        console.log("✅ FinanceOverview updated!");
      }
      res
        .status(201)
        .json({ message: "Offline sale recorded successfully", sale: newSale });
    } catch (error) {
      console.error("🔥 Error recording offline sale:", error);
      res.status(500).json({ error: "Failed to record offline sale" });
    }
  }
);

// Оновити інформацію про офлайн-продаж
router.patch(
  "/sales/:id",

  async (req, res) => {
    try {
      const { status } = req.body;
      if (!validSaleStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const sale = await OfflineSale.findById(req.params.id);
      if (!sale) {
        return res.status(404).json({ error: "Offline sale not found" });
      }

      if (sale.status === status) {
        return res.status(400).json({ error: "Sale already has this status" });
      }

      sale.status = status;
      await sale.save();
      console.log(`✅ Sale status updated to '${status}'`);
      res
        .status(200)
        .json({ message: "Offline sale updated successfully", sale });
    } catch (error) {
      console.error("🔥 Error updating offline sale:", error);
      res.status(500).json({ error: "Failed to update offline sale" });
    }
  }
);

module.exports = router;
