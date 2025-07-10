const express = require("express");
const router = express.Router();
const OnlineOrder = require("../../schemas/orders/onlineOrders");
const OnlineSale = require("../../schemas/sales/onlineSales");
const FinanceOverview = require("../../schemas/finance/financeOverview");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");
const { getIo } = require("../../config/socket");
const { handleSaleStockByIndex } = require("../../controller/stockController");
const StockMovement = require("../../schemas/accounting/stockMovement");
const Product = require("../../schemas/product");
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
    const { status } = req.body;
    const updatedBy = req.admin.id;
    const order = await OnlineOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = status;
    order.statusHistory.push({ status, updatedBy, updatedAt: new Date() });
    await order.save();
    const io = getIo();
    io.emit(`orderStatusUpdate:${order.userId}`, {
      orderId: order._id,
      status,
    });

    res.status(200).json({ message: "Order status updated", order });
  } catch (error) {
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// ✅ Конвертувати замовлення у продаж
router.put("/:id/sale", authenticateAdmin, async (req, res) => {
  try {
    const order = await OnlineOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "completed") {
      return res
        .status(400)
        .json({ error: "Order must be completed before converting to sale" });
    }

    // ⛓️ Перевіряємо чи всі продукти мають `index` і `name`
    const enrichedProducts = [];
    for (const item of order.products) {
      const product = await Product.findById(item.productId);
      if (!product || !product.index) continue;
      enrichedProducts.push({
        index: product.index,
        name: product.name,
        quantity: item.quantity,
        price: item.price,
      });
    }

    // ✅ Створюємо запис продажу
    const newSale = await OnlineSale.create({
      orderId: order._id,
      totalAmount: order.totalPrice,
      products: enrichedProducts,
      userId: order.userId,
      paymentMethod: order.paymentMethod,
      saleDate: new Date(),
    });

    // 📦 Створюємо рухи на складі
    await handleSaleStockByIndex(newSale, "OnlineSale");

    // 💰 Оновлюємо фінансову аналітику
    await FinanceOverview.updateOne(
      {},
      { $inc: { totalRevenue: order.totalPrice } }
    );

    // 🔄 Оновлюємо статус замовлення
    order.status = "sold";
    await order.save();

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

    for (const returned of returnedProducts) {
      const product = await Product.findById(returned.productId);
      if (!product || !product.index) continue;

      await StockMovement.create({
        productIndex: product.index,
        productName: product.name,
        type: "return",
        quantity: returned.quantity,
        unitPurchasePrice: product.purchasePrice.value || 0,
        date: new Date(),
        note: `Повернення з замовлення ${req.params.id}`,
      });
    }

    res
      .status(200)
      .json({ message: "Return processed successfully", onlineOrder });
  } catch (error) {
    console.error("🧨 Error processing return:", error);
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
