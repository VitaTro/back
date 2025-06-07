const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/authenticateUser");
const Payment = require("../schemas/paymentSchema");
const OnlineOrder = require("../schemas/finance/onlineOrders");
const OnlineSale = require("../schemas/finance/onlineSales");

// ✅ Ініціювати оплату
router.post("/initiate", authenticateUser, async (req, res) => {
  try {
    const { orderId, amount, paymentMethod } = req.body;

    if (!orderId || !amount || !paymentMethod) {
      return res.status(400).json({ error: "Invalid payment data" });
    }

    const newPayment = await Payment.create({
      userId: req.user.id,
      orderId,
      amount,
      paymentMethod,
      status: "pending",
    });

    res.status(201).json({ message: "Payment initiated", payment: newPayment });
  } catch (error) {
    console.error("❌ Payment initiation error:", error);
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

// ✅ Перевірити статус оплати
router.get("/status/:orderId", authenticateUser, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      orderId: req.params.orderId,
      userId: req.user.id,
    });
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    res.status(200).json({ status: payment.status });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment status" });
  }
});

// ✅ Підтвердити оплату та оновити замовлення
router.post("/confirm/:orderId", authenticateUser, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      orderId: req.params.orderId,
      userId: req.user.id,
    });
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    payment.status = "paid";
    await payment.save();

    const order = await OnlineOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = "paid";
    await order.save();

    // ✅ Автоматично додаємо замовлення в історію покупок
    await OnlineSale.create({
      userId: req.user.id,
      orderId: order._id,
      totalAmount: payment.amount,
      paymentMethod: payment.paymentMethod,
      saleDate: new Date(),
    });

    res
      .status(200)
      .json({ message: "Payment confirmed and order updated", order });
  } catch (error) {
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});
// ✅ Скасування платежу
router.post("/cancel/:orderId", authenticateUser, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      orderId: req.params.orderId,
      userId: req.user.id,
    });

    if (!payment || payment.status !== "pending") {
      return res.status(400).json({ error: "Cannot cancel payment" });
    }

    payment.status = "cancelled";
    await payment.save();

    res
      .status(200)
      .json({ message: "Payment cancelled successfully", payment });
  } catch (error) {
    res.status(500).json({ error: "Failed to cancel payment" });
  }
});

// ✅ Запит на повернення грошей
router.post("/refund/:orderId", authenticateUser, async (req, res) => {
  try {
    const { refundAmount } = req.body;

    const payment = await Payment.findOne({
      orderId: req.params.orderId,
      userId: req.user.id,
    });
    if (!payment || payment.status !== "paid") {
      return res.status(400).json({ error: "Refund not possible" });
    }

    payment.status = "refund_requested";
    payment.refundAmount = refundAmount;
    await payment.save();

    res.status(200).json({ message: "Refund request submitted", payment });
  } catch (error) {
    res.status(500).json({ error: "Failed to request refund" });
  }
});

// ✅ Отримати доступні методи оплати
router.get("/methods", authenticateUser, async (req, res) => {
  try {
    res.status(200).json({ methods: ["BLIK", "bank transfer"] });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment methods" });
  }
});
module.exports = router;
