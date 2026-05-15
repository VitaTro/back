const express = require("express");
const axios = require("axios");
const router = express.Router();
const { authenticateUser } = require("../../middleware/authenticateUser");
const Payment = require("../../schemas/paymentSchema");
const OnlineOrder = require("../../schemas/orders/onlineOrders");
const OnlineSale = require("../../schemas/sales/onlineSales");
const { createTrayTransaction } = require("../../services/tpayService");

// ===============================
// 🔵 INITIATE PAYMENT
// ===============================
router.post("/initiate", authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await OnlineOrder.findById(orderId);
    if (!order || order.userId.toString() !== req.user.id) {
      return res.status(404).json({ error: "❌ Nie znaleziono zamówienia." });
    }

    const amount = order.finalPrice;
    if (!amount) {
      return res
        .status(400)
        .json({ error: "❌ Brak kwoty do płatności dla tego zamówienia." });
    }

    const payment = await Payment.create({
      userId: req.user.id,
      orderId: order._id,
      amount,
      paymentMethod: "tpay",
      status: "pending",
    });

    const tpay = await createTrayTransaction({
      amount,
      orderId: order.orderId,
      email: req.user.email,
      name: order.deliveryAddress?.fullName || req.user.name || req.user.email,
    });

    if (!tpay || !tpay.paymentUrl || !tpay.transactionId) {
      return res
        .status(502)
        .json({ error: "❌ Tpay nie zwrócił poprawnych danych transakcji." });
    }
    payment.transactionId = tpay.transactionId;
    payment.paymentLinkUrl = tpay.paymentUrl;
    await payment.save();

    return res.status(201).json({
      message: "✅ Link do płatności Tpay został utworzony",
      paymentUrl: tpay.paymentUrl,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("❌ INITIATE PAYMENT ERROR:", error);
    res.status(500).json({ error: "❌ Nie udało się zainicjować płatności." });
  }
});

// ===============================
// 🔵 CHECK LOCAL PAYMENT STATUS
// ===============================
router.get("/status/:orderId", authenticateUser, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      orderId: req.params.orderId,
      userId: req.user.id,
    });

    if (!payment)
      return res.status(404).json({ error: "❌ Nie znaleziono płatności." });

    res.status(200).json({ status: payment.status });
  } catch (error) {
    res
      .status(500)
      .json({ error: "❌ Nie udało się pobrać statusu płatności." });
  }
});

// ===============================
// 🔵 CONFIRM PAYMENT (manual only)
// ===============================
router.post("/confirm/:orderId", authenticateUser, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      orderId: req.params.orderId,
      userId: req.user.id,
    });

    if (!payment)
      return res.status(404).json({ error: "❌ Nie znaleziono płatności." });

    // 🔹 Manual confirmation (bank transfer)
    payment.status = "paid";
    await payment.save();

    const order = await OnlineOrder.findById(req.params.orderId);
    if (!order)
      return res.status(404).json({ error: "❌ Nie znaleziono zamówienia." });

    order.status = "paid";
    order.paymentStatus = "paid";
    await order.save();

    await OnlineSale.create({
      userId: req.user.id,
      onlineOrderId: order._id,
      products: order.products.map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        salePrice: p.price,
      })),
      totalAmount: payment.amount,
      shippingCost: order.shippingCost || 0,
      paymentMethod: payment.paymentMethod,
      status: "completed",
      saleDate: new Date(),
    });

    res.status(200).json({
      message: "✅ Płatność potwierdzona.",
    });
  } catch (error) {
    res.status(500).json({ error: "❌ Nie udało się zakończyć płatności." });
  }
});

// ===============================
// 🔵 CANCEL PAYMENT
// ===============================
router.post("/cancel/:orderId", authenticateUser, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      orderId: req.params.orderId,
      userId: req.user.id,
    });

    if (!payment || payment.status !== "pending") {
      return res
        .status(400)
        .json({ error: "❌ Nie można anulować płatności." });
    }

    payment.status = "cancelled";
    await payment.save();

    res.status(200).json({
      message: "✅ Płatność została pomyślnie anulowana.",
      payment,
    });
  } catch (error) {
    res.status(500).json({ error: "❌ Nie udało się anulować płatności." });
  }
});

// ===============================
// 🔵 REFUND REQUEST
// ===============================
router.post("/refund/:orderId", authenticateUser, async (req, res) => {
  try {
    const { refundAmount } = req.body;

    const payment = await Payment.findOne({
      orderId: req.params.orderId,
      userId: req.user.id,
    });

    if (!payment || payment.status !== "paid") {
      return res.status(400).json({ error: "❌ Zwrot nie jest możliwy." });
    }

    payment.status = "refund_requested";
    payment.refundAmount = refundAmount || payment.amount;
    await payment.save();

    res.status(200).json({
      message: "✅ Wniosek o zwrot został złożony.",
      payment,
    });
  } catch (error) {
    res.status(500).json({ error: "❌ Nie udało się złożyć wniosku o zwrot." });
  }
});

// ===============================
// 🔵 AVAILABLE METHODS
// ===============================
router.get("/methods", authenticateUser, async (req, res) => {
  try {
    res.status(200).json({ methods: ["tpay"] });
  } catch (error) {
    res.status(500).json({ error: "❌ Nie udało się pobrać metod płatności." });
  }
});

module.exports = router;
