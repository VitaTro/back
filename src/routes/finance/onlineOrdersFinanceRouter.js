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
      .populate({
        path: "products.productId",
        select: "name photoUrl",
      })
      .populate("userId", "email name")
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
    console.error("🔥 Error in fetching online orders:", error);
    res.status(500).json({ error: "Failed to fetch online orders" });
  }
});

// Створити нове онлайн замовлення
router.post("/", validate(onlineOrderValidationSchema), async (req, res) => {
  try {
    console.log("➡️ Received request for online order.");
    console.log("Request Body:", req.body);

    const { products, totalPrice, paymentMethod, paymentStatus, userId } =
      req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ error: "Product list cannot be empty." });
    }

    // Автоматичний підрахунок totalQuantity
    const totalQuantity = products.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const newOnlineOrder = new OnlineOrder({
      products,
      totalQuantity, // ✅ Використовуємо автоматичний розрахунок
      totalPrice,
      paymentMethod,
      userId,
      paymentStatus,
      status: "new",
    });

    await newOnlineOrder.save();
    res.status(201).json({
      message: "Online order created successfully",
      onlineOrder: newOnlineOrder, // ✅ Замінено `order` на `onlineOrder`
    });
  } catch (error) {
    console.error("🔥 Error in creating online order:", error);
    res.status(500).json({ error: "Failed to create online order" });
  }
});

// Отримати конкретне онлайн замовлення
router.get("/:id", async (req, res) => {
  try {
    console.log(`🔎 Fetching online order with ID: ${req.params.id}`);

    const onlineOrder = await OnlineOrder.findById(req.params.id)
      .populate("products.productId", "name photoUrl")
      .populate("userId", "email name");

    if (!onlineOrder) {
      console.warn(`⚠️ Online order not found for ID: ${req.params.id}`);
      return res.status(404).json({ error: "Online order not found" });
    }

    console.log("✅ Online order fetched:", onlineOrder);
    res.status(200).json(onlineOrder);
  } catch (error) {
    console.error("🔥 Error in fetching online order:", error);
    res.status(500).json({ error: "Failed to fetch online order" });
  }
});

// Оновити статус онлайн замовлення та додати у `OnlineSales`
router.patch("/:id", async (req, res) => {
  try {
    console.log(
      `🛠 Updating online order ID: ${req.params.id} with status: ${req.body.status}`
    );
    console.log(
      `🛠 Updating order ID: ${req.params.id} with status: ${req.body.status}`
    );

    const { status } = req.body;
    const validStatuses = [
      "new",
      "assembled",
      "shipped",
      "completed",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      console.warn(`⚠️ Invalid status received: ${status}`);
      return res.status(400).json({ error: "Invalid status" });
    }

    const existingOnlineOrder = await OnlineOrder.findById(req.params.id);
    if (!existingOnlineOrder) {
      console.warn(`⚠️ Online order not found for ID: ${req.params.id}`);
      return res.status(404).json({ error: "Online order not found" });
    }

    if (existingOnlineOrder.status === status) {
      console.warn(`⚠️ Status is already '${status}', no update needed.`);
      return res
        .status(400)
        .json({ error: "Online order already has this status" });
    }

    // ✅ Оновлюємо статус онлайн-замовлення
    existingOnlineOrder.status = status;
    await existingOnlineOrder.save();

    console.log("✅ Online order status updated successfully!");

    // 📌 Якщо замовлення завершене, додаємо його в `OnlineSales`
    if (status === "completed") {
      console.log("📊 Checking if online order is already in OnlineSales...");
      const saleExists = await OnlineSale.findOne({
        orderId: existingOnlineOrder.orderId,
      });

      if (!saleExists) {
        console.log("📦 Adding online order to OnlineSales...");
        // Встановлюємо `paymentMethod`, якщо його немає в запиті
        const salePaymentMethod = existingOnlineOrder.paymentMethod || "card";

        // Встановлюємо `processedBy`, якщо його немає в запиті
        const saleProcessedBy = req.body.processedBy || "Admin";

        // Перевіряємо `products`, щоб уникнути помилок валідації
        const saleProducts = existingOnlineOrder.products.map((product) => ({
          productId: product.productId,
          quantity: product.quantity,
          salePrice: product.salePrice || product.price || 0, // Якщо `salePrice` немає, ставимо `0`
        }));

        const newOnlineSale = new OnlineSale({
          onlineOrderId: existingOnlineOrder._id,
          totalAmount: existingOnlineOrder.totalPrice,
          paymentMethod: salePaymentMethod, // 🔹 Тепер гарантовано визначена змінна
          processedBy: saleProcessedBy, // 🔹 Тепер гарантовано визначена змінна
          products: saleProducts,
          status: "completed",
          saleDate: new Date(),
        });

        await newOnlineSale.save();
        console.log("✅ Online sale saved successfully!");

        await OnlineOrder.deleteOne({ _id: existingOnlineOrder._id });
      } else {
        console.log("⚠️ Online order is already in OnlineSales, skipping...");
      }

      // 📌 Оновлюємо `FinanceOverview`
      console.log("🔍 Adding online order ID to FinanceOverview...");
      await FinanceOverview.updateOne(
        {},
        {
          $push: { completedOrders: existingOnlineOrder._id },
          $inc: { totalRevenue: existingOnlineOrder.totalPrice },
        },
        { upsert: true }
      );

      console.log("✅ Online order added to FinanceOverview!");
    }

    res.status(200).json({
      message: "Online order updated successfully",
      onlineOrder: existingOnlineOrder, // ✅ Замінено `order` на `onlineOrder`
    });
  } catch (error) {
    console.error("🔥 Error updating online order:", error);
    res.status(500).json({ error: "Failed to update online order" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    console.log(`🛠 Updating online order ID: ${req.params.id}...`);
    const updatedOrderData = req.body;

    const onlineOrder = await OnlineOrder.findById(req.params.id);
    if (!onlineOrder) {
      return res.status(404).json({ error: "❌ Замовлення не знайдено" });
    }

    // ✅ Додаємо статус в історію змін
    if (updatedOrderData.status && updatedOrderData.updatedBy) {
      onlineOrder.statusHistory.push({
        status: updatedOrderData.status,
        updatedBy: updatedOrderData.updatedBy,
      });
    }

    Object.assign(onlineOrder, updatedOrderData);
    await onlineOrder.save();

    console.log("✅ Online order updated successfully!");
    res.status(200).json({ message: "✅ Замовлення оновлено!", onlineOrder });
  } catch (error) {
    console.error("🔥 Помилка оновлення:", error);
    res.status(500).json({ error: "❌ Не вдалося оновити замовлення" });
  }
});

router.put("/:id/return", async (req, res) => {
  console.log("🔄 Отримані дані для повернення:", req.body);

  try {
    console.log(`🔄 Returning items for order ID: ${req.params.id}...`);
    const { returnedProducts, refundAmount, updatedBy } = req.body;
    if (!returnedProducts || returnedProducts.length === 0) {
      return res
        .status(400)
        .json({ error: "❌ Не вказані товари для повернення" });
    }

    const onlineOrder = await OnlineOrder.findById(req.params.id);
    if (!onlineOrder) {
      return res.status(404).json({ error: "❌ Замовлення не знайдено" });
    }

    let totalRefunded = 0;

    for (const product of onlineOrder.products) {
      const returnedItem = returnedProducts.find(
        (p) => p.productId === product.productId.toString()
      );

      if (returnedItem) {
        if (returnedItem.quantity > product.quantity) {
          return res.status(400).json({
            error: "❌ Кількість поверненого товару перевищує куплену!",
          });
        }

        await Product.updateOne(
          { _id: product.productId },
          { $inc: { stock: returnedItem.quantity } }
        );

        totalRefunded += returnedItem.quantity * product.price;
        product.quantity -= returnedItem.quantity;
      }
    }

    await FinanceOverview.updateOne(
      {},
      { $inc: { totalRevenue: -totalRefunded } }
    );

    onlineOrder.products = onlineOrder.products.filter((p) => p.quantity > 0);
    onlineOrder.statusHistory.push({
      status: "returned",
      updatedBy: updatedBy,
    });

    if (onlineOrder.products.length === 0) {
      onlineOrder.status = "returned";
    }

    await onlineOrder.save();

    console.log("✅ Items returned successfully!");
    res
      .status(200)
      .json({ message: "✅ Часткове повернення виконано!", onlineOrder });
  } catch (error) {
    console.error("🔥 Error processing return:", error);
    res.status(500).json({ error: "❌ Не вдалося виконати повернення" });
  }
});

module.exports = router;
