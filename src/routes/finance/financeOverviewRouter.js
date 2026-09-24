const express = require("express");
const router = express.Router();
const Admin = require("../../schemas/adminSchema");
const Expense = require("../../schemas/finance/expense");
const Product = require("../../schemas/product");
const OnlineSale = require("../../schemas/sales/onlineSales");
const OfflineSale = require("../../schemas/sales/offlineSales");
const PlatformSale = require("../../schemas/sales/platformSales");
const FinanceSettings = require("../../schemas/finance/financeSettings");
const Invoice = require("../../schemas/accounting/InvoiceSchema");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

router.get("/", authenticateAdmin, async (req, res) => {
  try {
    console.log("🔍 Fetching financial overview...");

    // 📊 Загальні лічильники
    const [
      totalAdmins,
      totalProducts,
      totalOnlineSales,
      totalOfflineSales,
      totalPlatformSales,
      totalInvoices,
    ] = await Promise.all([
      Admin.countDocuments(),
      Product.countDocuments(),
      OnlineSale.countDocuments({ status: "completed" }),
      OfflineSale.countDocuments({ status: "completed" }),
      PlatformSale.countDocuments({ status: "completed" }),
      Invoice.aggregate([
        {
          $group: { _id: null, totalInvoicesAmount: { $sum: "$finalPrice" } },
        },
      ]).then((data) => data[0]?.totalInvoicesAmount || 0),
    ]);

    // 📈 Продажі та прибуток
    const [onlineSalesData, offlineSalesData, refundsData, platformSalesData] =
      await Promise.all([
        OnlineSale.aggregate([
          {
            $group: {
              _id: null,
              totalSales: { $sum: "$finalPrice" },
              netProfit: { $sum: { $subtract: ["$finalPrice", "$cost"] } },
            },
          },
        ]),
        OfflineSale.aggregate([
          {
            $group: {
              _id: null,
              totalSales: { $sum: "$finalPrice" },
              netProfit: { $sum: { $subtract: ["$finalPrice", "$cost"] } },
            },
          },
        ]),
        OfflineSale.aggregate([
          { $match: { status: "returned" } },
          { $group: { _id: null, totalRefunds: { $sum: "$refundAmount" } } },
        ]),
        PlatformSale.aggregate([
          {
            $group: {
              _id: null,
              totalSales: { $sum: "$finalPrice" },
              netProfit: { $sum: "$netProfit" },
            },
          },
        ]),
      ]);

    const totalRevenue =
      (onlineSalesData[0]?.totalSales || 0) +
      (offlineSalesData[0]?.totalSales || 0) +
      (platformSalesData[0]?.totalSales || 0);

    const expensesData = await Expense.aggregate([
      { $group: { _id: null, totalExpenses: { $sum: "$amount" } } },
    ]);
    const totalExpensesFromRecords = expensesData[0]?.totalExpenses || 0;

    const profitForecast = totalRevenue - totalExpensesFromRecords;

    // 💳 Методи оплати по джерелах
    const [
      onlinePaymentBreakdown,
      offlinePaymentBreakdown,
      platformPaymentBreakdown,
    ] = await Promise.all([
      OnlineSale.aggregate([
        {
          $group: {
            _id: "$paymentMethod",
            total: { $sum: "$finalPrice" },
          },
        },
      ]),
      OfflineSale.aggregate([
        {
          $group: {
            _id: "$paymentMethod",
            total: { $sum: "$finalPrice" },
          },
        },
      ]),
      PlatformSale.aggregate([
        {
          $group: {
            _id: "$paymentMethod",
            total: { $sum: "$finalPrice" },
          },
        },
      ]),
    ]);

    const formatPaymentMethods = (data) => {
      const result = {};
      data.forEach(({ _id, total }) => {
        result[_id] = total;
      });
      return result;
    };

    const paymentMethods = {
      online: formatPaymentMethods(onlinePaymentBreakdown),
      offline: formatPaymentMethods(offlinePaymentBreakdown),
      platform: formatPaymentMethods(platformPaymentBreakdown),
    };

    // 📦 Товари з низьким залишком
    const lowStockItems = await Product.find({ stock: { $lt: 2 } }).select(
      "name stock photo index",
    );

    // 🧾 Продажі
    const completedSalesOffline = await OfflineSale.find({
      status: "completed",
    })
      .select(
        "products finalPrice discount discountPercent paymentMethod createdAt",
      )
      .lean();

    const completedSalesOnline = await OnlineSale.find({ status: "completed" })
      .select(
        "products finalPrice discount discountPercent paymentMethod createdAt",
      )
      .lean();

    const completedSalesPlatform = await PlatformSale.find({
      status: "completed",
    })
      .select(
        "products finalPrice discount discountPercent paymentMethod createdAt saleDate",
      )
      .lean();

    const completedSales = [
      ...completedSalesOffline.map((sale) => ({
        ...sale,
        source: "offline",
        totalPrice: sale.finalPrice + (sale.discount || 0), // стара ціна
        discount: sale.discount || 0,
        discountPercent: sale.discountPercent || 0,
      })),
      ...completedSalesOnline.map((sale) => ({
        ...sale,
        source: "online",
        totalPrice: sale.finalPrice + (sale.discount || 0), // стара ціна
        discount: sale.discount || 0,
        discountPercent: sale.discountPercent || 0,
      })),
      ...completedSalesPlatform.map((sale) => ({
        ...sale,
        source: "platform",
        totalPrice: sale.finalPrice + (sale.discount || 0), // стара ціна
        discount: sale.discount || 0,
        discountPercent: sale.discountPercent || 0,
      })),
    ];

    const refundedSales = await OfflineSale.find({ status: "returned" }).select(
      "products refundAmount paymentMethod createdAt",
    );

    const financeSettings = (await FinanceSettings.findOne()) || {
      taxRate: 0,
      operatingCosts: 0,
      budgetForProcurement: 0,
    };
    const offlineDiscounts = await OfflineSale.aggregate([
      { $match: { status: "completed", discount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$discount" } } },
    ]);

    const onlineDiscounts = await OnlineSale.aggregate([
      { $match: { status: "completed", discount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$discount" } } },
    ]);

    const platformDiscounts = await PlatformSale.aggregate([
      { $match: { status: "completed", discount: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$discount" } } },
    ]);

    // 📊 Підсумковий звіт
    const financialOverview = {
      stats: {
        totalAdmins,
        totalProducts,
        totalOnlineSales,
        totalOfflineSales,
        totalPlatformSales,
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
          totalSales: platformSalesData[0]?.totalSales || 0,
          netProfit: platformSalesData[0]?.netProfit || 0,
        },
        refunds: refundsData[0]?.totalRefunds || 0,
        profitForecast,
        discounts: {
          offline: offlineDiscounts[0]?.total || 0,
          online: onlineDiscounts[0]?.total || 0,
          platform: platformDiscounts[0]?.total || 0,
        },
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
