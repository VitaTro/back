const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middleware/authenticateUser");
const OnlineOrder = require("../schemas/finance/onlineOrders");
const Invoice = require("../schemas/InvoiceSchema");
const generateInvoicePDF = require("../config/invoicePdfGenerator");
const uploadToDrive = require("../services/uploadToDrive");

// ✅ Генерувати фактуру після оплати
router.post("/generate/:orderId", authenticateUser, async (req, res) => {
  try {
    const {
      buyerType = "individual",
      buyerName,
      buyerAddress,
      buyerNIP,
    } = req.body;
    const order = await OnlineOrder.findById(req.params.orderId);

    if (!order || order.status !== "paid") {
      return res
        .status(400)
        .json({ error: "Invoice can be generated only after payment" });
    }

    const invoiceData = {
      userId: req.user.id,
      orderId: order._id,
      invoiceType: "online",
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      buyerType,
    };

    // 🎯 Встановлення реквізитів покупця
    if (buyerType === "company") {
      invoiceData.buyerName = buyerName;
      invoiceData.buyerAddress = buyerAddress;
      invoiceData.buyerNIP = buyerNIP;
    } else if (buyerType === "individual") {
      invoiceData.buyerName = buyerName || order.buyerName;
      invoiceData.buyerAddress = buyerAddress || order.buyerAddress;
    }

    // Створюємо інвойс (без invoiceNumber — згенерується автоматично)
    const invoice = new Invoice(invoiceData);
    await invoice.validate(); // вручну, щоб зловити валідацію до збереження

    // 🧾 Генерація PDF
    const pdfPath = await generateInvoicePDF(invoice, buyerType);
    invoice.filePath = pdfPath;

    // ☁️ Завантаження в Google Drive
    const publicUrl = await uploadToDrive(
      pdfPath,
      `${invoice.invoiceNumber}.pdf`
    );
    invoice.fileUrl = publicUrl;

    await invoice.save();

    res.status(200).json({ message: "Invoice generated", invoice });
  } catch (error) {
    console.error("❌ Failed to generate invoice:", error.message);
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

// ✅ Завантажити фактуру (з локального шляху або з Drive)
router.get("/download/:orderId", authenticateUser, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ orderId: req.params.orderId });

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    // Якщо є filePath → завантаження з диска
    if (invoice.filePath) {
      return res.download(invoice.filePath);
    }

    // Інакше перекинути на хмарне посилання
    if (invoice.fileUrl) {
      return res.redirect(invoice.fileUrl);
    }

    res.status(404).json({ error: "Invoice file not available" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invoice file" });
  }
});

module.exports = router;
