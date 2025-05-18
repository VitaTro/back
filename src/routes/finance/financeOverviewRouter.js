const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Admin = require("../../schemas/adminSchema");
const Product = require("../../schemas/product");
const OnlineOrder = require("../../schemas/finance/onlineOrders");
const OfflineOrder = require("../../schemas/finance/offlineOrders");
const OnlineSale = require("../../schemas/finance/onlineSales");
const OfflineSale = require("../../schemas/finance/offlineSales");
const FinanceSettings = require("../../schemas/finance/financeSettings");
const FinanceOverview = require("../../schemas/finance/financeOverview");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

router.get("/", authenticateAdmin, async (req, res) => {
  try {
    console.log("🔍 Fetching financial overview...");

    const [
      totalAdmins,
      totalProducts,
      totalOnlineSales,
      totalOfflineSales,
      totalRevenue,
    ] = await Promise.all([
      Admin.countDocuments(),
      Product.countDocuments(),
      OnlineSale.countDocuments({ status: "completed" }),
      OfflineSale.countDocuments({ status: "completed" }),
      FinanceOverview.findOne().select("totalRevenue"),
    ]);

    // ✅ Продажі за методами оплати
    const paymentMethods = await Promise.all([
      OfflineSale.aggregate([
        { $match: { paymentMethod: "cash" } },
        { $group: { _id: null, totalCash: { $sum: "$totalAmount" } } },
      ]).then((data) => data[0]?.totalCash || 0),

      OnlineSale.aggregate([
        { $match: { paymentMethod: "card" } },
        { $group: { _id: null, totalCard: { $sum: "$totalAmount" } } },
      ]).then((data) => data[0]?.totalCard || 0),

      OnlineSale.aggregate([
        { $match: { paymentMethod: "bank_transfer" } },
        { $group: { _id: null, totalBank: { $sum: "$totalAmount" } } },
      ]).then((data) => data[0]?.totalBank || 0),
    ]);

    // ✅ Огляд продуктів: низький залишок
    const lowStockItems = await Product.find({ stock: { $lt: 5 } }).select(
      "name stock photo index"
    );

    // ✅ Виконані замовлення та повернення
    const completedSales = await OfflineSale.find({
      status: "completed",
    }).select("products totalPrice paymentMethod createdAt");
    const refundedSales = await OfflineSale.find({ status: "returned" }).select(
      "products refundAmount paymentMethod createdAt"
    );

    // ✅ Дані про продажі
    const [onlineSalesData, offlineSalesData, refundsData] = await Promise.all([
      OnlineSale.aggregate([
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$totalAmount" },
            netProfit: { $sum: { $subtract: ["$totalAmount", "$cost"] } },
          },
        },
      ]),
      OfflineSale.aggregate([
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$totalAmount" },
            netProfit: { $sum: { $subtract: ["$totalAmount", "$cost"] } },
          },
        },
      ]),
      OfflineSale.aggregate([
        { $match: { status: "returned" } },
        { $group: { _id: null, totalRefunds: { $sum: "$refundAmount" } } },
      ]),
    ]);

    // ✅ Дані з налаштувань фінансів
    const financeSettings = (await FinanceSettings.findOne()) || {
      taxRate: 0,
      operatingCosts: 0,
      budgetForProcurement: 0,
    };

    // ✅ Розрахунок `profitForecast`
    const totalExpenses =
      financeSettings.operatingCosts +
      financeSettings.budgetForProcurement +
      (refundsData[0]?.totalRefunds || 0);
    const profitForecast = (totalRevenue?.totalRevenue || 0) - totalExpenses;

    // ✅ Формуємо фінансовий огляд
    const financialOverview = {
      stats: {
        totalAdmins,
        totalProducts,
        totalOnlineSales,
        totalOfflineSales,
        totalRevenue: totalRevenue?.totalRevenue || 0,
      },
      paymentMethods,
      completedSales,
      refundedSales,
      lowStockItems,
      salesOverview: {
        online: {
          totalSales: onlineSalesData[0]?.totalSales || 0,
          netProfit: onlineSalesData[0]?.netProfit || 0,
        },
        offline: {
          totalSales: offlineSalesData[0]?.totalSales || 0,
          netProfit: offlineSalesData[0]?.netProfit || 0,
        },
        refunds: refundsData[0]?.totalRefunds || 0,
        profitForecast,
      },
      financeSettings,
    };

    console.log("✅ Financial overview fetched:", financialOverview);
    res.status(200).json(financialOverview);
  } catch (error) {
    console.error("🔥 Error in /finance/overview route:", error);
    res.status(500).json({ error: "Failed to load financial overview" });
  }
});

module.exports = router;
