const mongoose = require("mongoose");

const financeSettingsSchema = new mongoose.Schema({
  taxRate: { type: Number, required: true }, // Ставка податку у відсотках
  operatingCosts: { type: Number, required: true }, // Загальні витрати на операції
  budgetForProcurement: { type: Number, required: true }, // Бюджет на закупівлю товарів
  lastUpdated: { type: Date, default: Date.now }, // Останнє оновлення
});

const FinanceSettings = mongoose.model(
  "FinanceSettings",
  financeSettingsSchema
);
module.exports = FinanceSettings;
