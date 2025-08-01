const express = require("express");
const router = express.Router();
const Admin = require("../../schemas/adminSchema");
const Expense = require("../../schemas/finance/expense");
const Product = require("../../schemas/product");
const OnlineSale = require("../../schemas/sales/onlineSales");
const OfflineSale = require("../../schemas/sales/offlineSales");
const FinanceSettings = require("../../schemas/finance/financeSettings");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");
const Invoice = require("../../schemas/accounting/InvoiceSchema");
const PlatformOrder = require("../../schemas/orders/platformOrders");

router.get("/", authenticateAdmin, async (req, res) => {
  try {
    console.log("🔍 Fetching financial overview...");

    const [
      totalAdmins,
      totalProducts,
      totalOnlineSales,
      totalOfflineSales,
      totalInvoices,
    ] = await Promise.all([
      Admin.countDocuments(),
      Product.countDocuments(),
      OnlineSale.countDocuments({ status: "completed" }),
      OfflineSale.countDocuments({ status: "completed" }),
      Invoice.aggregate([
        {
          $group: { _id: null, totalInvoicesAmount: { $sum: "$totalAmount" } },
        },
      ]).then((data) => data[0]?.totalInvoicesAmount || 0),
    ]);

    // ✅ Дані про продажі
    const [onlineSalesData, offlineSalesData, refundsData, platformOrdersData] =
      await Promise.all([
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
        PlatformOrder.aggregate([
          {
            $group: {
              _id: null,
              totalPlatformOrders: { $sum: "$totalAmount" }, // Припустимо є поле totalAmount
              netProfit: { $sum: { $subtract: ["$totalAmount", "$cost"] } }, // Якщо потрібно
            },
          },
        ]),
      ]);

    // ✅ Реальний totalRevenue
    const totalRevenue =
      (onlineSalesData[0]?.totalSales || 0) +
      (offlineSalesData[0]?.totalSales || 0) +
      (platformOrdersData[0]?.totalSales || 0);

    // ✅ Витрати
    const expensesData = await Expense.aggregate([
      { $group: { _id: null, totalExpenses: { $sum: "$amount" } } },
    ]);
    const totalExpensesFromRecords = expensesData[0]?.totalExpenses || 0;

    // ✅ Прибуток
    const profitForecast = totalRevenue - totalExpensesFromRecords;

    // ✅ Продажі за методами оплати
    const paymentMethods = await Promise.all([
      OnlineSale.aggregate([
        { $match: { paymentMethod: "BLIK" } },
        { $group: { _id: null, totalBlik: { $sum: "$totalAmount" } } },
      ]).then((data) => data[0]?.totalBlik || 0),
      OnlineSale.aggregate([
        { $match: { paymentMethod: "bank_transfer" } },
        { $group: { _id: null, totalBank: { $sum: "$totalAmount" } } },
      ]).then((data) => data[0]?.totalBank || 0),
    ]);

    // ✅ Товари з низьким залишком
    const lowStockItems = await Product.find({ stock: { $lt: 2 } }).select(
      "name stock photo index"
    );

    // ✅ Деталі про виконані продажі
    const completedSalesOffline = await OfflineSale.find({
      status: "completed",
    })
      .select("products totalPrice paymentMethod createdAt")
      .lean();

    const completedSalesOnline = await OnlineSale.find({ status: "completed" })
      .select("products totalAmount paymentMethod createdAt")
      .lean();

    const completedSales = [
      ...completedSalesOffline
        .filter((sale) => sale.paymentMethod !== "cash")
        .map((sale) => ({
          ...sale,
          source: "offline",
          totalPrice: sale.totalPrice,
        })),
      ...completedSalesOnline.map((sale) => ({
        ...sale,
        source: "online",
        totalPrice: sale.totalAmount,
      })),
    ];

    const refundedSales = await OfflineSale.find({ status: "returned" }).select(
      "products refundAmount paymentMethod createdAt"
    );

    const financeSettings = (await FinanceSettings.findOne()) || {
      taxRate: 0,
      operatingCosts: 0,
      budgetForProcurement: 0,
    };

    const financialOverview = {
      stats: {
        totalAdmins,
        totalProducts,
        totalOnlineSales,
        totalOfflineSales,
        totalRevenue,
        totalInvoices,
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
        platform: {
          totalSales: platformOrdersData[0]?.totalSales || 0,
          netProfit: platformOrdersData[0]?.netProfit || 0,
        },
        refunds: refundsData[0]?.totalRefunds || 0,
        profitForecast,
      },
      financeSettings,
      expenses: {
        totalFromRecords: totalExpensesFromRecords,
      },
    };

    console.log("✅ Financial overview fetched:", financialOverview);
    res.status(200).json(financialOverview);
  } catch (error) {
    console.error("🔥 Error in /finance/overview route:", error);
    res.status(500).json({ error: "Failed to load financial overview" });
  }
});

module.exports = router;
