const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/authenticateUser");
const OnlineOrder = require("../schemas/finance/onlineOrders");
const Invoice = require("../schemas/InvoiceSchema");
const generateInvoicePDF = require("../config/invoicePdfGenerator");
// ✅ Генерувати фактуру після оплати
router.post("/generate/:orderId", authenticateUser, async (req, res) => {
  try {
    const { buyerType, buyerName, buyerAddress, buyerNIP } = req.body;
    const order = await OnlineOrder.findById(req.params.orderId);

    if (!order || order.status !== "paid") {
      return res
        .status(400)
        .json({ error: "Invoice can be generated only after payment" });
    }

    const newInvoice = await Invoice.create({
      userId: req.user.id,
      orderId: order._id,
      invoiceNumber: `INV-${Date.now()}`,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      issueDate: new Date(),
      buyerType,
      buyerName,
      buyerAddress,
      buyerNIP: buyerType === "company" ? buyerNIP : null,
    });
    const pdfPath = await generateInvoicePDF(newInvoice, buyerType);
    newInvoice.filePath = pdfPath;
    await newInvoice.save();
    res.status(200).json({ message: "Invoice generated", invoice: newInvoice });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate invoice" });
  }
});

// ✅ Отримати фактуру за замовленням
router.get("/:orderId", authenticateUser, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ orderId: req.params.orderId });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    res.status(200).json(invoice);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invoice" });
  }
});
router.get("/download/:orderId", authenticateUser, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ orderId: req.params.orderId });

    if (!invoice || !invoice.filePath) {
      return res.status(404).json({ error: "Invoice file not found" });
    }

    res.download(invoice.filePath);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invoice file" });
  }
});
module.exports = router;
