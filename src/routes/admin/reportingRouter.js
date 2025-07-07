const express = require("express");
const router = express.Router();
const OnlineSale = require("../../schemas/sales/onlineSales");
const OfflineSale = require("../../schemas/sales/offlineSales");
const Expense = require("../../schemas/finance/expense");
const StockMovement = require("../../schemas/accounting/stockMovement");
const Product = require("../../schemas/product");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

router.get("/dashboard", authenticateAdmin, async (req, res) => {
  try {
    const startDate = req.query.start ? new Date(req.query.start) : null;
    const endDate = req.query.end ? new Date(req.query.end) : null;

    const dateFilter =
      startDate && endDate
        ? {
            $gte: startDate,
            $lte: endDate,
          }
        : undefined;
    // Дохід: онлайн + офлайн
    const onlineRevenueAgg = await OnlineSale.aggregate([
      dateFilter ? { $match: { saleDate: dateFilter } } : {},
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const offlineRevenueAgg = await OfflineSale.aggregate([
      dateFilter ? { $match: { saleDate: dateFilter } } : {},
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    const onlineRevenue = onlineRevenueAgg[0]?.total || 0;
    const offlineRevenue = offlineRevenueAgg[0]?.total || 0;
    const totalRevenue = onlineRevenue + offlineRevenue;

    // Витрати
    const expenseAgg = await Expense.aggregate([
      { $match: dateFilter ? { date: dateFilter } : {} },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalExpenses = expenseAgg[0]?.total || 0;

    // Прибуток
    const totalProfit = totalRevenue - totalExpenses;

    // Залишки
    const stockAgg = await StockMovement.aggregate([
      { $match: dateFilter ? { date: dateFilter } : {} },
      {
        $group: {
          _id: "$product",
          total: { $sum: "$quantity" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          name: "$product.name",
          index: "$product.index",
          quantity: "$total",
        },
      },
      { $sort: { quantity: 1 } },
    ]);

    // Топ-5 продаж
    const topSalesAgg = await StockMovement.aggregate([
      { $match: { type: "sale" } },
      {
        $group: {
          _id: "$product",
          sold: { $sum: { $multiply: ["$quantity", -1] } }, // бо продажі — негативна кількість
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          name: "$product.name",
          index: "$product.index",
          sold: 1,
        },
      },
      { $sort: { sold: -1 } },
      { $limit: 5 },
    ]);

    const marginAgg = await StockMovement.aggregate([
      { $match: { type: "sale" } },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
      {
        $addFields: {
          costPerUnitPLN: {
            $cond: [
              { $eq: ["$productDetails.purchasePrice.currency", "PLN"] },
              "$productDetails.purchasePrice.value",
              {
                $multiply: [
                  "$productDetails.purchasePrice.value",
                  "$productDetails.purchasePrice.exchangeRateToPLN",
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          product: "$productDetails.name",
          index: "$productDetails.index",
          quantitySold: { $multiply: ["$quantity", -1] },
          revenue: {
            $multiply: ["$unitPrice", { $multiply: ["$quantity", -1] }],
          },
          costPerUnitPLN: 1,
        },
      },
      {
        $addFields: {
          totalCost: { $multiply: ["$quantitySold", "$costPerUnitPLN"] },
          margin: {
            $subtract: [
              { $multiply: ["$unitPrice", "$quantitySold"] },
              { $multiply: ["$costPerUnitPLN", "$quantitySold"] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$index",
          product: { $first: "$product" },
          quantitySold: { $sum: "$quantitySold" },
          totalRevenue: { $sum: "$revenue" },
          totalCost: { $sum: "$totalCost" },
          margin: { $sum: "$margin" },
        },
      },
      { $sort: { margin: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      revenue: { onlineRevenue, offlineRevenue, totalRevenue },
      expenses: totalExpenses,
      profit: totalProfit,
      stockSummary: stockAgg,
      topSales: topSalesAgg,
      productMargins: marginAgg,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

module.exports = router;
