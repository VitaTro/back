const express = require("express");
const router = express.Router();
const dotenv = require("dotenv");
const axios = require("axios");
const { getAllPoints, trackShipment } = require("../../config/inpostService");
const {
  sendAdminOrderNotification,
  sendAdminReturnNotification,
} = require("../../config/emailService");
const { authenticateUser } = require("../../middleware/authenticateUser");
const { getIo } = require("../../config/socket");
const StockMovement = require("../../schemas/accounting/stockMovement");
const User = require("../../schemas/userSchema");
const OnlineOrder = require("../../schemas/orders/onlineOrders");
const OnlineSale = require("../../schemas/sales/onlineSales");
const Product = require("../../schemas/product");
const Payment = require("../../schemas/paymentSchema");
const FinanceOverview = require("../../schemas/finance/financeOverview");
const { calculateStock } = require("../../services/calculateStock");
const { createPaylink } = require("../../services/elavonService");
require("dotenv").config();

// ✅ Отримати всі замовлення користувача
router.get("/", authenticateUser, async (req, res) => {
  try {
    const userOrders = await OnlineOrder.find({ userId: req.user.id })
      .sort({
        createdAt: -1,
      })
      .populate(
        "products.productId",
        "name photoUrl price quantity color size width length"
      );
    res.status(200).json(userOrders);
  } catch {
    res.status(500).json({ error: "Failed to fetch user orders" });
  }
});

// ✅ Фільтрація по статусу
const createStatusRoute = (status) =>
  router.get(`/${status}`, authenticateUser, async (req, res) => {
    try {
      const orders = await OnlineOrder.find({ userId: req.user.id, status });
      res.status(200).json(orders);
    } catch {
      res.status(500).json({ error: `Failed to fetch ${status} orders` });
    }
  });

["unpaid", "processing", "shipped"].forEach(createStatusRoute);

// ✅ Створення нового замовлення
router.post("/", authenticateUser, async (req, res) => {
  try {
    const {
      products,
      pickupPointId,
      deliveryType,
      deliveryAddress,
      smartboxDetails,
      notes,
    } = req.body;

    if (!products || products.length === 0)
      return res.status(400).json({ error: "Не передано товари" });

    if (deliveryType === "pickup" && !pickupPointId)
      return res.status(400).json({ error: "Pickup point is required" });

    if (deliveryType === "courier") {
      const requiredFields = ["postalCode", "city", "street", "houseNumber"];
      for (const field of requiredFields) {
        if (!deliveryAddress?.[field]) {
          return res
            .status(400)
            .json({ error: `Missing delivery address: ${field}` });
        }
      }
    }

    if (deliveryType === "smartbox") {
      if (!smartboxDetails?.boxId || !smartboxDetails?.location)
        return res
          .status(400)
          .json({ error: "Missing smartbox delivery details" });
    }

    const enrichedProducts = [];
    let totalPrice = 0;

    for (const item of products) {
      const lastMovement = await StockMovement.findOne({
        productId: item.productId,
        type: { $in: ["sale", "purchase"] },
      }).sort({ date: -1 });

      if (
        !lastMovement ||
        !lastMovement.productIndex ||
        !lastMovement.productName
      ) {
        return res
          .status(400)
          .json({ error: `Немає рухів по товару ${item.productId}` });
      }

      const stockLevel = await calculateStock(lastMovement.productIndex);
      if (stockLevel < item.quantity) {
        return res.status(400).json({
          error: `Недостатньо на складі: ${lastMovement.productName}`,
        });
      }

      const product = await Product.findById(item.productId);

      const unitPrice =
        product?.lastRetailPrice ??
        lastMovement.unitSalePrice ??
        lastMovement.price ??
        product?.price ??
        lastMovement.unitPurchasePrice ??
        0;

      totalPrice += unitPrice * item.quantity;

      enrichedProducts.push({
        productId: item.productId,
        index: lastMovement.productIndex,
        name: lastMovement.productName,
        quantity: item.quantity,
        price: unitPrice,
        photoUrl: product?.photoUrl || "",
      });
    }

    const totalQuantity = enrichedProducts.reduce(
      (sum, p) => sum + p.quantity,
      0
    );

    const newOrder = new OnlineOrder({
      userId: req.user.id,
      products: enrichedProducts,
      totalPrice,
      totalQuantity,
      paymentMethod: "elavon_link",
      pickupPointId,
      deliveryType,
      deliveryAddress,
      smartboxDetails,
      notes,
      status: "new",
    });

    await newOrder.save();

    await User.findByIdAndUpdate(req.user.id, {
      address: deliveryAddress,
    });

    const expiryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const payLink = await createPaylink({
      amount: totalPrice,
      currency: "PLN",
      orderId: newOrder.orderId,
      email: req.user.email,
      expiryDate,
    });

    newOrder.payLink = payLink;
    await newOrder.save();

    await sendAdminOrderNotification(newOrder);

    res.status(201).json({
      message: "✅ Замовлення створено і перевірено по складу",
      order: newOrder,
      payLink: newOrder.payLink,
    });
  } catch (error) {
    console.error("❌ Помилка створення замовлення:", error);
    res.status(500).json({
      error: error.message || "Не вдалося створити замовлення",
    });
  }
});

// ✅ Запит на повернення
router.put("/:orderId/return", authenticateUser, async (req, res) => {
  try {
    const { returnedProducts, refundAmount } = req.body;
    if (!returnedProducts?.length) {
      return res
        .status(400)
        .json({ error: "Не вибрано товари для повернення" });
    }
    const order = await OnlineOrder.findOne({
      _id: req.params.orderId,
      userId: req.user.id,
      status: { $in: ["completed", "paid", "shipped"] },
    });
    if (!order) {
      return res
        .status(404)
        .json({ error: "❌ Замовлення не підходить для повернення" });
    }

    let totalRefunded = 0;

    for (const returned of returnedProducts) {
      const originalItem = order.products.find(
        (p) => p.productId.toString() === returned.productId
      );

      if (!originalItem) {
        return res.status(400).json({
          error: `❌ Товар не знайдено в замовленні: ${returned.productId}`,
        });
      }
      if (returned.quantity > originalItem.quantity) {
        return res.status(400).json({
          error: `🚫 Кількість повернення перевищує куплену для ${originalItem.name}`,
        });
      }

      await StockMovement.create({
        productId: originalItem.productId,
        productIndex: originalItem.index,
        productName: originalItem.name,
        quantity: returned.quantity,
        type: "return",
        unitPurchasePrice: originalItem.price,
        price: originalItem.price,
        saleSource: "OnlineSale",
        relatedSaleId: order._id,
        date: new Date(),
        note: "Повернення товару користувачем",
      });

      // 🧮 Оновлюємо продукт через calculateStock
      const productDoc = await Product.findById(originalItem.productId);
      if (productDoc) {
        const stockCount = await calculateStock(originalItem.index);
        productDoc.quantity = stockCount;
        productDoc.currentStock = stockCount;
        productDoc.inStock = stockCount > 0;
        await productDoc.save();
      }

      totalRefunded += returned.quantity * originalItem.price;
    }

    // 💳 Оновлення статусу платежу, якщо є
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (payment) {
      payment.status = "refunded";
      payment.refundAmount = refundAmount || totalRefunded;
      await payment.save();
    }

    order.status = "returned";
    order.refundAmount = refundAmount || totalRefunded;
    await order.save();

    await sendAdminReturnNotification(order);

    return res.status(200).json({
      message: "✅ Повернення успішно оброблено",
      order,
    });
  } catch (error) {
    console.error("🔥 Помилка обробки повернення:", error);
    return res.status(500).json({ error: "❌ Не вдалося обробити повернення" });
  }
});
// ✅ Користувач підтверджує отримання
router.patch("/:id/received", authenticateUser, async (req, res) => {
  try {
    const order = await OnlineOrder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "shipped")
      return res.status(400).json({ error: "Order not ready" });

    order.status = "completed";
    order.statusHistory.push({
      status: "completed",
      updatedBy: req.user.id,
      updatedAt: new Date(),
    });

    await order.save();
    getIo().emit("adminOrderUpdate", {
      orderId: order._id,
      status: "completed",
    });

    res.status(200).json({ message: "Order marked as received", order });
  } catch {
    res.status(500).json({ error: "Failed to confirm received" });
  }
});

// ✅ Історія покупок
router.get("/purchase-history", authenticateUser, async (req, res) => {
  try {
    const { startDate, endDate, status, page = 1, limit = 25 } = req.query;
    const filter = { userId: req.user.id };

    if (startDate && endDate) {
      filter.saleDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const purchaseHistory = await OnlineSale.find(filter)
      .populate("onlineOrderId", "totalAmount paymentMethod saleDate status")
      .populate("products.productId", "name photoUrl price quantity")
      .sort({ saleDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await OnlineSale.countDocuments(filter);

    if (!purchaseHistory.length) {
      return res.status(404).json({ error: "No purchase history found" });
    }

    res.status(200).json({
      message: "Purchase history retrieved successfully",
      totalOrders,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalOrders / limit),
      purchaseHistory,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch purchase history" });
  }
});

// ✅ Отримання поштоматів
router.get("/pickup-points", authenticateUser, async (req, res) => {
  try {
    const pickupPoints = await getAllPoints();
    if (!pickupPoints?.length)
      return res.status(404).json({ error: "No pickup points found" });

    res.status(200).json({ points: pickupPoints });
  } catch (error) {
    console.error("Pickup points error:", error);
    res.status(500).json({ error: "Failed to fetch pickup points" });
  }
});

// ✅ Трекінг доставки
router.get("/track/:trackingNumber", authenticateUser, async (req, res) => {
  try {
    const shipmentStatus = await trackShipment(req.params.trackingNumber);
    if (!shipmentStatus)
      return res.status(404).json({ error: "Tracking number not found" });

    res.status(200).json(shipmentStatus);
  } catch {
    res.status(500).json({ error: "Failed to fetch tracking status" });
  }
});

module.exports = router;
