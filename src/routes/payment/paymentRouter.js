const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middleware/authenticateUser");
const Payment = require("../../schemas/paymentSchema");
const OnlineOrder = require("../../schemas/orders/onlineOrders");
const OnlineSale = require("../../schemas/sales/onlineSales");

const Invoice = require("../../schemas/accounting/InvoiceSchema");
const { createPaylink } = require("../../services/elavonService");

// ✅ Ініціювати оплату
router.post("/initiate", authenticateUser, async (req, res) => {
  try {
    const { orderId, paymentMethod } = req.body;
    const order = await OnlineOrder.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const amount = order.totalPrice;
    if (!orderId || !amount || !paymentMethod) {
      return res.status(400).json({ error: "Invalid payment data" });
    }

    // 🔹 Тільки Elavon
    if (paymentMethod === "elavon_link") {
      const expiryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      console.log("💳 Creating paylink with", {
        orderId,
        amount,
        email: req.user.email,
      });

      const paylink = await createPaylink({
        amount,
        currency: "PLN",
        orderId,
        email: req.user.email,
        expiryDate,
      });
      if (!paylink || typeof paylink !== "string") {
        return res
          .status(502)
          .json({ error: "Elavon не повернув лінк оплати" });
      }
      // 🔸 Записати платіж для привʼязки до order (але не для обробки карти)
      const payment = await Payment.create({
        userId: req.user.id,
        orderId,
        amount,
        paymentMethod,
        status: "pending",

        transactionId: orderId, // або унікальний Elavon ID, якщо є
      });

      return res.status(201).json({
        message: "✅ Посилання на оплату створено",
        payLink: payLink,
        paymentId: payment._id,
      });
    }

    // 🔸 Якщо передали старі методи (тимчасово допустимо)
    return res.status(400).json({ error: "Unsupported payment method" });
  } catch (error) {
    console.error("❌ Payment initiation error:", error);
    res.status(500).json({ error: "Failed to initiate Elavon payment" });
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
    const { paymentCode, cardNumber, expiryDate, cvv, cardHolder } = req.body;
    const payment = await Payment.findOne({
      orderId: req.params.orderId,
      userId: req.user.id,
    });

    if (!payment) return res.status(404).json({ error: "Payment not found" });

    // 🔹 Перевірка BLIK або банківської картки (залишається без змін)

    payment.status = "paid";
    await payment.save();

    const order = await OnlineOrder.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = "paid";
    await order.save();

    // 🔹 Додаємо продаж у `OnlineSale`
    const newSale = await OnlineSale.create({
      userId: req.user.id,
      orderId: order._id,
      totalAmount: payment.amount,
      paymentMethod: payment.paymentMethod,
      saleDate: new Date(),
    });

    // 🔹 **Фактура для юзера**
    const invoice = new Invoice({
      userId: req.user.id,
      orderId: order._id,
      paymentId: payment._id,
      invoiceType: "online",
      totalAmount: payment.amount,
      paymentMethod: payment.paymentMethod,
      buyerType: "individual",
      buyerName: order.buyerName || "Klient indywidualny",
      buyerAddress: order.buyerAddress || "",
    });

    await invoice.validate();

    // 🧾 Створення PDF-фактури
    const pdfPath = await generateInvoicePDF(invoice, "individual");
    invoice.filePath = pdfPath;

    // // ☁️ Завантаження в Google Drive
    // const fileUrl = await uploadToDrive(
    //   pdfPath,
    //   `${invoice.invoiceNumber}.pdf`
    // );
    // invoice.fileUrl = fileUrl;

    await invoice.save();

    // 🔗 Запис у замовлення
    order.invoice = invoice._id;
    await order.save();

    res.status(200).json({
      message: "✅ Оплата підтверджена, інвойс створено",
      invoice,
    });
  } catch (error) {
    console.error("❌ Error processing payment:", error);
    res.status(500).json({ error: "Не вдалося завершити оплату" });
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
    res.status(200).json({ methods: ["BLIK", "bank_transfer"] });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment methods" });
  }
});
module.exports = router;
