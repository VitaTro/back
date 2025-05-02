const mongoose = require("mongoose");
const OfflineOrder = require("./offlineOrders");

const financeOverviewSchema = new mongoose.Schema({
  completedOrders: [
    { type: mongoose.Schema.Types.ObjectId, ref: "OfflineOrder" },
  ],
  totalRevenue: { type: Number, default: 0 },
});

const FinanceOverview = mongoose.model(
  "FinanceOverview",
  financeOverviewSchema
);
module.exports = FinanceOverview;
