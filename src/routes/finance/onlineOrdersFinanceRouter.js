const express = require("express");
const router = express.Router();
const OnlineOrder = require("../../schemas/finance/onlineOrders");
const OnlineSale = require("../../schemas/finance/onlineSales");
const FinanceOverview = require("../../schemas/finance/financeOverview");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

// ✅ Отримати всі онлайн-замовлення з пагінацією і фільтром
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const filter = req.query.status
      ? { status: req.query.status }
      : { status: { $ne: "archived" } };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const onlineOrders = await OnlineOrder.find(filter)
      .populate("products.productId", "name photoUrl")
      .populate("userId", "email name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ onlineOrders, page, limit });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch online orders" });
  }
});

// ✅ Отримати конкретне онлайн-замовлення
router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const onlineOrder = await OnlineOrder.findById(req.params.id)
      .populate("products.productId", "name photoUrl")
      .populate("userId", "email name");

    if (!onlineOrder) {
      return res.status(404).json({ error: "Online order not found" });
    }

    res.status(200).json(onlineOrder);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch online order" });
  }
});

// ✅ Створити нове онлайн-замовлення
router.post("/", authenticateAdmin, async (req, res) => {
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
      return res.status(400).json({ error: "Invalid order data" });
    }

    const newOrder = new OnlineOrder({
      userId,
      products,
      totalPrice,
      paymentStatus: "unpaid",
      paymentMethod,
      deliveryType: deliveryType || "courier",
      deliveryAddress,
      status: "new",
    });

    await newOrder.save();
    res
      .status(201)
      .json({ message: "Order created successfully!", onlineOrder: newOrder });
  } catch (error) {
    res.status(500).json({ error: "Failed to create order" });
  }
});

// ✅ Оновити статус замовлення
router.patch("/:id/status", authenticateAdmin, async (req, res) => {
  try {
    const { status, updatedBy } = req.body;
    const validStatuses = [
      "new",
      "received",
      "assembled",
      "shipped",
      "completed",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const order = await OnlineOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.statusHistory.push({ status, updatedBy, updatedAt: new Date() });
    order.status = status;

    await order.save();
    res.status(200).json({ message: "Order status updated", order });
  } catch (error) {
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// ✅ Конвертувати замовлення у продаж
router.put("/:id/sale", authenticateAdmin, async (req, res) => {
  try {
    console.log(`🔄 Converting order ID: ${req.params.id} to sale...`);

    const order = await OnlineOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "completed") {
      return res
        .status(400)
        .json({ error: "Order must be completed before converting to sale" });
    }

    // ✅ Створюємо продаж у `OnlineSale`
    const newSale = await OnlineSale.create({
      orderId: order._id,
      totalAmount: order.totalPrice,
      paymentMethod: order.paymentMethod,
      saleDate: new Date(),
    });

    console.log("✅ Sale recorded:", newSale);

    // ✅ Оновлюємо фінансовий огляд
    await FinanceOverview.updateOne(
      {},
      { $inc: { totalRevenue: order.totalPrice } }
    );

    console.log("💰 FinanceOverview updated!");

    // ✅ Оновлюємо статус замовлення на `"sold"`
    order.status = "sold";
    await order.save();

    console.log("✅ Order status updated to 'sold'");
    for (const item of order.products) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: -item.quantity },
      });
    }
    console.log("✅ Product stock updated!");

    res
      .status(200)
      .json({ message: "Sale processed successfully!", sale: newSale });
  } catch (error) {
    console.error("🔥 Error processing sale:", error);
    res.status(500).json({ error: "Failed to process sale" });
  }
});

// ✅ Оформити повернення товару
router.put("/:id/return", authenticateAdmin, async (req, res) => {
  try {
    const { returnedProducts, refundAmount, updatedBy } = req.body;
    if (!returnedProducts || returnedProducts.length === 0) {
      return res.status(400).json({ error: "No returned products specified" });
    }

    const onlineOrder = await OnlineOrder.findById(req.params.id);
    if (!onlineOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    onlineOrder.status = "cancelled";
    onlineOrder.statusHistory.push({ status: "cancelled", updatedBy });
    await onlineOrder.save();

    res
      .status(200)
      .json({ message: "Return processed successfully", onlineOrder });
  } catch (error) {
    res.status(500).json({ error: "Failed to process return" });
  }
});

router.patch("/:id", authenticateAdmin, async (req, res) => {
  console.log("🚀 Запит на оновлення замовлення:", req.params.id);

  try {
    const { status, updatedBy, deliveryType, deliveryAddress } = req.body;
    const validStatuses = [
      "new",
      "received",
      "assembled",
      "shipped",
      "completed",
      "cancelled",
    ];

    const order = await OnlineOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "❌ Замовлення не знайдено" });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: "❌ Некоректний статус" });
    }

    // ✅ Оновлюємо статус та записуємо історію змін
    if (status) {
      order.status = status;
      order.statusHistory.push({ status, updatedBy, updatedAt: new Date() });
    }

    if (deliveryType) order.deliveryType = deliveryType;
    if (deliveryAddress) order.deliveryAddress = deliveryAddress;

    await order.save();
    console.log("✅ Замовлення оновлено:", order);

    res.status(200).json({ message: "✅ Замовлення успішно оновлено!", order });
  } catch (error) {
    console.error("🔥 Помилка оновлення замовлення:", error);
    res.status(500).json({ error: "❌ Не вдалося оновити замовлення" });
  }
});

router.put("/:id", authenticateAdmin, async (req, res) => {
  console.log("🛠️ Повне оновлення замовлення:", req.params.id);

  try {
    const updatedOrderData = req.body;

    const order = await OnlineOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "❌ Замовлення не знайдено" });
    }

    // ✅ Додаємо зміну статусу до `statusHistory`
    if (updatedOrderData.status && updatedOrderData.updatedBy) {
      order.statusHistory.push({
        status: updatedOrderData.status,
        updatedBy: updatedOrderData.updatedBy,
        updatedAt: new Date(),
      });
    }

    // ✅ Перезаписуємо замовлення (але не торкаємося `_id`)
    Object.assign(order, updatedOrderData);
    await order.save();

    console.log("✅ Замовлення повністю оновлено!");
    res.status(200).json({ message: "✅ Замовлення оновлено!", order });
  } catch (error) {
    console.error("🔥 Помилка оновлення:", error);
    res.status(500).json({ error: "❌ Не вдалося оновити замовлення" });
  }
});

module.exports = router;
