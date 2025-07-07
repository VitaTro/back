const mongoose = require("mongoose");

const monthlyReportSchema = new mongoose.Schema(
  {
    month: {
      type: String, // формат YYYY-MM
      required: true,
      unique: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    revenue: {
      online: { type: Number, default: 0 },
      offline: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    expenses: {
      total: { type: Number, default: 0 },
      byCategory: { type: Map, of: Number, default: {} },
    },
    profit: {
      type: Number,
      default: 0,
    },
    invoices: [
      {
        number: String,
        amount: Number,
        status: String,
        date: Date,
      },
    ],
    stockSnapshot: [
      {
        name: String,
        index: String,
        quantity: Number,
      },
    ],
  },
  { collection: "monthlyReports" }
);

const MonthlyReport = mongoose.model("MonthlyReport", monthlyReportSchema);
module.exports = MonthlyReport;
