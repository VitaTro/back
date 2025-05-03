const express = require("express");
const FinanceSettings = require("../../schemas/finance/financeSettings");
const router = express.Router();

// ✅ GET: Отримати фінансові налаштування
router.get("/", async (req, res) => {
  try {
    let financeSettings = await FinanceSettings.findOne();
    if (!financeSettings) {
      console.warn("⚠️ FinanceSettings not found, creating default...");
      financeSettings = new FinanceSettings({
        taxRate: 20, // Дефолтні значення
        operatingCosts: 5000,
        budgetForProcurement: 15000,
      });
      await financeSettings.save(); // ❗️ Тепер ми зберігаємо його в БД
    }

    res.status(200).json(financeSettings);
  } catch (error) {
    console.error("🔥 Error fetching finance settings:", error);
    res.status(500).json({ error: "Failed to fetch finance settings" });
  }
});

// ✅ PATCH: Оновити фінансові налаштування
router.patch("/", async (req, res) => {
  try {
    const updatedSettings = await FinanceSettings.findOneAndUpdate(
      {},
      req.body,
      { new: true }
    );
    if (!updatedSettings) {
      console.warn("⚠️ No finance settings found to update.");
      return res.status(404).json({ error: "Finance settings not found" });
    }

    res.status(200).json(updatedSettings);
  } catch (error) {
    console.error("🔥 Error updating finance settings:", error);
    res.status(500).json({ error: "Failed to update finance settings" });
  }
});

module.exports = router;
