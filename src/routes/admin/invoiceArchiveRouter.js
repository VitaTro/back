const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");
const Invoice = require("../../schemas/accounting/InvoiceSchema");

// 📂 Вивід усіх інвойсів для архіву
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ issueDate: -1 });
    res.status(200).json(invoices);
  } catch (error) {
    console.error("❌ Failed to fetch invoice archive:", error);
    res.status(500).json({ error: "Server error while loading invoices" });
  }
});

module.exports = router;
