const mongoose = require("mongoose");
const OfflineSale = require("./offlineSales");
const OnlineSale = require("./onlineSales");

const financeOverviewSchema = new mongoose.Schema({
  totalRevenue: { type: Number, default: 0 }, // Загальний дохід
  totalProfit: { type: Number, default: 0 }, // 💰 Чистий прибуток
  expenses: { type: Number, default: 0 }, // 🛠 Витрати (операційні, закупівлі)
  completedSales: [
    { type: mongoose.Schema.Types.ObjectId, ref: "OfflineSale" },
    { type: mongoose.Schema.Types.ObjectId, ref: "OnlineSale" },
  ], // ✅ Тепер зберігаємо продажі, а не замовлення!
});

const FinanceOverview = mongoose.model(
  "FinanceOverview",
  financeOverviewSchema
);
module.exports = FinanceOverview;
