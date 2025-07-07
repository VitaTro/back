const express = require("express");
const router = express.Router();
const MonthlyReport = require("../../schemas/accounting/monthlyReport");
const generateMonthlyReport = require("../../services/generateMonthlyReport");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

// Отримати список усіх звітів
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const reports = await MonthlyReport.find().sort({ month: -1 });
    res.status(200).json(reports);
  } catch (error) {
    console.error("❌ Error fetching reports:", error);
    res.status(500).json({ error: "Failed to retrieve reports" });
  }
});

// Отримати звіт за конкретний місяць
router.get("/:month", authenticateAdmin, async (req, res) => {
  try {
    const { month } = req.params; // формат "2025-07"
    const report = await MonthlyReport.findOne({ month });
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.status(200).json(report);
  } catch (error) {
    console.error("❌ Error fetching monthly report:", error);
    res.status(500).json({ error: "Failed to retrieve report" });
  }
});

// (Опційно) ручне створення звіту
router.post("/generate", authenticateAdmin, async (req, res) => {
  try {
    await generateMonthlyReport();
    res.status(201).json({ message: "Monthly report generated successfully" });
  } catch (error) {
    console.error("❌ Error generating report manually:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

module.exports = router;
