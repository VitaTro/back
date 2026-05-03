const express = require("express");
const axios = require("axios");
const router = express.Router();
const { authenticateUser } = require("../../middleware/authenticateUser");
const Payment = require("../../schemas/paymentSchema");
const OnlineOrder = require("../../schemas/orders/onlineOrders");
const OnlineSale = require("../../schemas/sales/onlineSales");
const { createPaylink } = require("../../services/elavonService");

// ===============================
// 🔵 INITIATE PAYMENT
// ===============================
router.post("/initiate", authenticateUser, async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;

    const order = await OnlineOrder.findById(orderId);
    if (!order)
      return res.status(404).json({ error: "❌ Nie znaleziono zamówienia." });

    const amount = order.totalPrice;
    if (!orderId || !amount || !paymentMethod) {
      return res
        .status(400)
        .json({ error: "❌ Nieprawidłowe dane płatności." });
    }

    // 🟢 ELAVON PAYMENT LINK
    if (paymentMethod === "elavon_link") {
      const expiryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      const payLink = await createPaylink({
        amount,
        currency: "PLN",
        orderId,
        email: req.user.email,
        expiryDate,
      });

      if (!payLink || !payLink.url) {
        return res
          .status(502)
          .json({ error: "❌ Elavon nie zwrócił linku do płatności." });
      }

      const payment = await Payment.create({
        userId: req.user.id,
        orderId,
        amount,
        paymentMethod: "elavon_link",
        status: "pending",
        paymentLinkId: payLink.id,
        paymentLinkUrl: payLink.url,
        transactionId: orderId,
      });

      return res.status(201).json({
        message: "✅ Link do płatności Elavon został utworzony",
        payLink: payLink.url,
        paymentId: payment._id,
      });
    }

    // 🟡 BANK TRANSFER
    if (paymentMethod === "bank_transfer") {
      const payment = await Payment.create({
        userId: req.user.id,
        orderId,
        amount,
        paymentMethod: "bank_transfer",
        status: "pending",
        transactionId: `BT-${orderId}`,
      });

      const bankDetails = {
        bankName: "Credit Agricole",
        iban: "PL27194010763280694000000000",
        swift: "AGRIPLPR",
        recipientName: "Nika Gold",
        reference: `ZAMÓWIENIE #${order._id}`,
        amount,
        currency: "PLN",
      };

      return res.status(201).json({
        message: "✅ Dane do przelewu zostały utworzone.",
        bankDetails,
        paymentId: payment._id,
      });
    }

    return res
      .status(400)
      .json({ error: "❌ Nieobsługiwana metoda płatności." });
  } catch (error) {
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
      orderId: order._id,
      totalAmount: payment.amount,
      paymentMethod: payment.paymentMethod,
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
    payment.refundAmount = refundAmount;
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
    res.status(200).json({ methods: ["BLIK", "bank_transfer"] });
  } catch (error) {
    res.status(500).json({ error: "❌ Nie udało się pobrać metod płatności." });
  }
});

// ===============================
// 🔵 CHECK ELAVON PAYMENT STATUS
// ===============================
router.get(
  "/elavon/check/:paymentLinkId",
  authenticateUser,
  async (req, res) => {
    try {
      const { paymentLinkId } = req.params;

      const authHeader =
        "Basic " +
        Buffer.from(
          `${process.env.ELAVON_PUBLIC_KEY}:${process.env.ELAVON_SECRET_KEY}`,
        ).toString("base64");

      const response = await axios.get(
        `https://uat.api.converge.eu.elavonaws.com/payment-links/${paymentLinkId}`,
        {
          headers: {
            Accept: "application/json;charset=UTF-8",
            Authorization: authHeader,
            "Accept-Version": "1",
          },
        },
      );

      const status = response.data.status?.[0];

      res.json({ status });
    } catch (error) {
      res
        .status(500)
        .json({ error: "❌ Nie udało się pobrać statusu Elavon." });
    }
  },
);

module.exports = router;
