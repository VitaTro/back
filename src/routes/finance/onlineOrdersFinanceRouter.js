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
router.post("/", async (req, res) => {
  console.log("🚀 Отримано запит на створення замовлення!");
  console.log("📦 Дані замовлення:", req.body);
  console.log("📍 `deliveryType` передано як:", req.body.deliveryType);

  try {
    const {
      userId,
      products,
      totalPrice,
      paymentMethod,
      deliveryType,
      deliveryAddress,
    } = req.body;

    if (!userId || !products || products.length === 0) {
      console.warn("⚠️ Помилка: `userId` або `products` порожні!");
      return res.status(400).json({ error: "❌ Некоректні дані замовлення" });
    }

    // ✅ Встановлюємо `"courier"` за замовчуванням, якщо `deliveryType` відсутній
    const finalDeliveryType = deliveryType || "courier";

    const newOrder = new OnlineOrder({
      userId,
      products,
      totalPrice,
      paymentStatus: "unpaid",
      paymentMethod,
      deliveryType: finalDeliveryType,
      deliveryAddress,
      status: "new",
    });

    await newOrder.save();
    console.log("✅ Замовлення створено!", newOrder);

    res
      .status(201)
      .json({ message: "✅ Замовлення створено!", onlineOrder: newOrder });
  } catch (error) {
    console.error("🔥 Помилка створення замовлення:", error.message);
    res.status(500).json({
      error: "❌ Не вдалося створити замовлення",
      errorMessage: error.message,
    });
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
  console.log("🚀 Отримано PATCH-запит для оновлення замовлення!");
  console.log(`🛠 Запит на ID: ${req.params.id}, оновлення:`, req.body);

  try {
    const { status, userId, deliveryType, deliveryAddress } = req.body;

    // 🔍 Спочатку шукаємо замовлення у базі, щоб `existingOrder` точно був визначений
    const existingOrder = await OnlineOrder.findById(req.params.id);

    // ✅ Переконуємося, що замовлення існує перед використанням
    if (!existingOrder) {
      console.warn(`⚠️ Замовлення не знайдено для ID: ${req.params.id}`);
      return res.status(404).json({ error: "Замовлення не знайдено" });
    }

    console.log("🔄 Поточний статус:", existingOrder.status);
    console.log("📦 Поточний `deliveryType`:", existingOrder.deliveryType);
    console.log("👤 Поточний `userId`:", existingOrder.userId);

    // ✅ Якщо `userId` відсутній, встановлюємо тестового користувача (ObjectId)
    if (!existingOrder.userId) {
      console.warn("❌ `userId` відсутній, встановлюємо тестового.");
      existingOrder.userId = new mongoose.Types.ObjectId(
        "6567c542e92d2b3f6f1b29d8"
      ); // 🔹 Тимчасовий ID
    }

    // ✅ Якщо `deliveryType` відсутній, встановлюємо `"courier"`
    if (!existingOrder.deliveryType) {
      console.warn("❌ `deliveryType` відсутній, встановлюємо `courier`.");
      existingOrder.deliveryType = "courier";
    }

    // ✅ Якщо `deliveryAddress` порожнє, ставимо тестову адресу
    if (
      !existingOrder.deliveryAddress &&
      existingOrder.deliveryType === "courier"
    ) {
      console.warn(
        "❌ `deliveryAddress` відсутній, встановлюємо тестову адресу."
      );
      existingOrder.deliveryAddress = "Тестова адреса, 123, Київ, Україна";
    }

    existingOrder.status = status || existingOrder.status;
    await existingOrder.save();

    console.log("✅ Замовлення успішно оновлено!");

    res.status(200).json({
      message: "Замовлення успішно оновлено!",
      onlineOrder: existingOrder,
    });
  } catch (error) {
    console.error("🔥 Помилка сервера:", error.message);
    res
      .status(500)
      .json({ error: "Помилка сервера", errorMessage: error.message });
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
      console.warn("⚠️ Порожній список товарів для повернення!");
      return res
        .status(400)
        .json({ error: "❌ Не вказані товари для повернення" });
    }

    const onlineOrder = await OnlineOrder.findById(req.params.id);
    if (!onlineOrder) {
      console.warn(`⚠️ Замовлення з ID: ${req.params.id} не знайдено!`);
      return res.status(404).json({ error: "❌ Замовлення не знайдено" });
    }

    console.log("📦 Поточний `deliveryType`:", onlineOrder.deliveryType);
    console.log("💳 Поточний `paymentMethod`:", onlineOrder.paymentMethod);
    console.log("👤 Поточний `userId`:", onlineOrder.userId);

    // ✅ Додаємо `deliveryType`, `paymentMethod` та `userId`, якщо вони порожні
    if (!onlineOrder.deliveryType) {
      console.warn("❌ `deliveryType` відсутній, встановлюємо `courier`.");
      onlineOrder.deliveryType = "courier";
    }
    if (!onlineOrder.paymentMethod) {
      console.warn("❌ `paymentMethod` відсутній, встановлюємо `card`.");
      onlineOrder.paymentMethod = "card";
    }
    if (!onlineOrder.userId) {
      console.warn(
        "❌ `userId` відсутній, встановлюємо тестового користувача."
      );
      onlineOrder.userId = new mongoose.Types.ObjectId(
        "6567c542e92d2b3f6f1b29d8"
      );
    }

    // ✅ Оновлюємо статус замовлення (замінюємо `"returned"` на `"cancelled"`)
    onlineOrder.status = "cancelled";
    onlineOrder.statusHistory.push({
      status: "cancelled",
      updatedBy: updatedBy,
    });

    await onlineOrder.save();

    console.log("✅ Items returned successfully!");
    res.status(200).json({ message: "✅ Повернення виконано!", onlineOrder });
  } catch (error) {
    console.error("🔥 Error processing return:", error.message);
    res.status(500).json({
      error: "❌ Не вдалося виконати повернення",
      errorMessage: error.message,
    });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { status, updatedBy } = req.body;

    // ✅ Перевіряємо, чи статус допустимий
    const validStatuses = [
      "new",
      "received",
      "assembled",
      "shipped",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "❌ Некоректний статус" });
    }

    const order = await OnlineOrder.findById(req.params.id);
    if (!order)
      return res.status(404).json({ error: "❌ Замовлення не знайдено" });

    // ✅ Додаємо зміну у `statusHistory`
    order.statusHistory.push({
      status,
      updatedBy,
      updatedAt: new Date(),
    });

    // ✅ Якщо статус `"cancelled"` і платіж не пройшов, підтверджуємо скасування
    if (status === "cancelled" && order.paymentStatus === "unpaid") {
      order.status = "cancelled";
    } else {
      order.status = status;
    }

    await order.save();

    // 🔹 Відправляємо оновлення користувачу через Socket.io
    io.emit("orderStatusUpdated", {
      orderId: order._id,
      newStatus: order.status,
    });

    res.status(200).json({ message: "✅ Статус оновлено", order });
  } catch (error) {
    console.error("❌ Помилка оновлення статусу:", error);
    res.status(500).json({ error: "❌ Не вдалося оновити статус" });
  }
});

module.exports = router;
