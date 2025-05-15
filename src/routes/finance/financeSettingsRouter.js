const express = require("express");
const FinanceSettings = require("../../schemas/finance/financeSettings");
const { isAdmin } = require("../../middleware/adminMiddleware");
const router = express.Router();

// ✅ GET: Отримати фінансові налаштування
router.get("/", async (req, res) => {
  try {
    let financeSettings = await FinanceSettings.findOne();

    if (!financeSettings) {
      console.warn("⚠️ FinanceSettings not found, creating default...");
      financeSettings = await FinanceSettings.create({
        taxRate: 20, // Дефолтні значення
        operatingCosts: 5000,
        budgetForProcurement: 15000,
      });
    }

    res.status(200).json(financeSettings);
  } catch (error) {
    console.error("🔥 Error fetching finance settings:", error);
    res.status(500).json({ error: "Failed to fetch finance settings" });
  }
});

// ✅ PATCH: Оновити існуючі налаштування (лише для адмінів)
router.patch("/", isAdmin, async (req, res) => {
  try {
    const { taxRate, operatingCosts, budgetForProcurement } = req.body;

    if (taxRate < 0 || operatingCosts < 0 || budgetForProcurement < 0) {
      return res.status(400).json({ error: "Values cannot be negative." });
    }

    const updatedSettings = await FinanceSettings.findOneAndUpdate(
      {},
      {
        taxRate,
        operatingCosts,
        budgetForProcurement,
        lastUpdated: Date.now(),
      },
      { new: true }
    );

    if (!updatedSettings) {
      console.warn("⚠️ No finance settings found to update.");
      return res.status(404).json({ error: "Finance settings not found" });
    }

    res.status(200).json({
      message: "Finance settings updated successfully",
      settings: updatedSettings,
    });
  } catch (error) {
    console.error("🔥 Error updating finance settings:", error);
    res.status(500).json({ error: "Failed to update finance settings" });
  }
});

module.exports = router;
