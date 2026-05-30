const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middleware/authenticateUser");

const Payment = require("../../schemas/paymentSchema");
const OnlineOrder = require("../../schemas/orders/onlineOrders");
const OnlineSale = require("../../schemas/sales/onlineSales");

const { createTpayTransaction } = require("../../services/tpayService");

// ===============================
// 🔵 INITIATE PAYMENT (NEW API)
// ===============================
router.post("/initiate", authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await OnlineOrder.findById(orderId);
    if (!order || order.userId.toString() !== req.user.id) {
      return res.status(404).json({ error: "Nie znaleziono zamówienia." });
    }

    const amount = order.finalPrice;
    if (!amount) {
      return res.status(400).json({ error: "Brak kwoty do płatności." });
    }

    // Create local payment record
    const payment = await Payment.create({
      userId: req.user.id,
      orderId: order._id,
      amount,
      paymentMethod: "tpay",
      status: "pending",
    });

    // Create Tpay transaction
    const tpay = await createTpayTransaction({
      amount,
      orderId: order.orderId,
      email: req.user.email,
      name: order.deliveryAddress?.fullName || req.user.name || req.user.email,
    });

    if (!tpay || !tpay.paymentUrl || !tpay.transactionId) {
      return res
        .status(502)
        .json({ error: "Tpay nie zwrócił poprawnych danych." });
    }

    payment.transactionId = tpay.transactionId;
    payment.paymentLinkUrl = tpay.paymentUrl;
    await payment.save();

    return res.status(201).json({
      message: "Link do płatności Tpay został utworzony",
      paymentUrl: tpay.paymentUrl,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("INITIATE PAYMENT ERROR:", error);
    res.status(500).json({ error: "Nie udało się zainicjować płatności." });
  }
});

// ===============================
// 🔵 WEBHOOK (NEW API FORMAT)
// ===============================
router.post("/webhook", async (req, res) => {
  try {
    const { data } = req.body;

    if (!data?.transactionId) {
      return res.status(400).json({ error: "Brak transactionId" });
    }

    const payment = await Payment.findOne({
      transactionId: data.transactionId,
    });
    if (!payment) {
      return res.status(404).json({ error: "Nie znaleziono płatności" });
    }

    // NEW API: status = "correct"
    if (data.status === "correct") {
      payment.status = "paid";
      await payment.save();

      const order = await OnlineOrder.findById(payment.orderId);
      if (order) {
        order.status = "paid";
        order.paymentStatus = "paid";
        await order.save();

        await OnlineSale.create({
          userId: order.userId,
          onlineOrderId: order._id,
          products: order.products.map((p) => ({
            productId: p.productId,
            quantity: p.quantity,
            salePrice: p.price,
          })),
          totalAmount: payment.amount,
          shippingCost: order.shippingCost || 0,
          paymentMethod: "tpay",
          status: "completed",
          saleDate: new Date(),
        });
      }
    }

    res.status(200).json({ message: "OK" });
  } catch (error) {
    console.error("TPAY WEBHOOK ERROR:", error);
    res.status(500).json({ error: "Webhook error" });
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

    if (!payment) {
      return res.status(404).json({ error: "Nie znaleziono płatności." });
    }

    res.status(200).json({ status: payment.status });
  } catch (error) {
    res.status(500).json({ error: "Nie udało się pobrać statusu płatności." });
  }
});

module.exports = router;
