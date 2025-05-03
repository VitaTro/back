const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../../schemas/user");
const Product = require("../../schemas/product");
const OnlineOrder = require("../../schemas/finance/onlineOrders");
const OfflineOrder = require("../../schemas/finance/offlineOrders");
const OnlineSale = require("../../schemas/finance/onlineSales");
const OfflineSale = require("../../schemas/finance/offlineSales");
const FinanceSettings = require("../../schemas/finance/financeSettings"); // Схема для налаштувань
const FinanceOverview = require("../../schemas/finance/financeOverview");

// GET: Отримати загальний фінансовий огляд
router.get("/", async (req, res) => {
  try {
    console.log("🔍 Fetching financial overview...");

    // Загальна статистика
    const stats = {
      totalUsers: await User.countDocuments(),
      totalProducts: await Product.countDocuments(),

      // Продажі (а не просто замовлення!)
      totalOnlineSales: await OnlineSale.countDocuments(),
      totalOfflineSales: await OfflineSale.countDocuments(),

      // Загальна виручка за методами оплати
      totalRevenue: await FinanceOverview.findOne().select("totalRevenue"),

      paymentMethods: {
        cash: await OfflineSale.aggregate([
          { $match: { paymentMethod: "cash" } },
          { $group: { _id: null, totalCash: { $sum: "$totalAmount" } } },
        ]).then((data) => data[0]?.totalCash || 0),

        card: await OfflineSale.aggregate([
          { $match: { paymentMethod: "card" } },
          { $group: { _id: null, totalCard: { $sum: "$totalAmount" } } },
        ]).then((data) => data[0]?.totalCard || 0),

        bank_transfer: await OfflineSale.aggregate([
          { $match: { paymentMethod: "bank_transfer" } },
          { $group: { _id: null, totalBank: { $sum: "$totalAmount" } } },
        ]).then((data) => data[0]?.totalBank || 0),
      },
    };

    // Огляд продуктів: низький залишок
    const lowStockItems = await Product.find({ stock: { $lt: 5 } }).select(
      "name stock photo index"
    );

    // Огляд виконаних замовлень
    const completedSales = await OfflineSale.find({
      status: "completed",
    }).select("products totalPrice paymentMethod createdAt");

    const financeOverview = await FinanceOverview.findOne({}).populate(
      "completedSales"
    );
    console.log("🔎 Populated completedSales:", financeOverview.completedSales);

    // Дані продажів: загальна сума та прибуток
    const onlineSalesData = await OnlineSale.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          netProfit: { $sum: "$salePrice" },
        },
      },
    ]);
    const offlineSalesData = await OfflineSale.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          netProfit: { $sum: "$price" },
        },
      },
    ]);

    const salesOverview = {
      online: {
        totalSales: onlineSalesData[0]?.totalSales || 0,
        netProfit: onlineSalesData[0]?.netProfit || 0,
      },
      offline: {
        totalSales: offlineSalesData[0]?.totalSales || 0,
        netProfit: offlineSalesData[0]?.netProfit || 0,
      },
    };

    // Дані з налаштувань фінансів
    const financeSettings = (await FinanceSettings.findOne()) || {
      taxRate: 0,
      operatingCosts: 0,
      budgetForProcurement: 0,
    };

    // Формуємо фінансовий огляд
    const financialOverview = {
      stats,
      completedSales,
      lowStockItems,
      salesOverview,
      financeSettings,
    };

    console.log("✅ Financial overview fetched:", financialOverview);
    res.status(200).json(financialOverview);
  } catch (error) {
    console.error("🔥 Error in /finance/overview route:", error);
    res.status(500).json({ error: "Failed to load financial overview" });
  }
});

// POST: Створити нові налаштування фінансів
router.post("/", async (req, res) => {
  try {
    const { taxRate, operatingCosts, budgetForProcurement } = req.body;

    const newSettings = new FinanceSettings({
      taxRate,
      operatingCosts,
      budgetForProcurement,
    });

    await newSettings.save();
    res.status(201).json({
      message: "Finance settings created successfully",
      settings: newSettings,
    });
  } catch (error) {
    console.error("Error creating finance settings:", error);
    res.status(500).json({ error: "Failed to create finance settings" });
  }
});

// PATCH: Оновити існуючі налаштування фінансів
router.patch("/", async (req, res) => {
  try {
    const { taxRate, operatingCosts, budgetForProcurement } = req.body;

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
      return res.status(404).json({ message: "Finance settings not found" });
    }

    res.status(200).json({
      message: "Finance settings updated successfully",
      settings: updatedSettings,
    });
  } catch (error) {
    console.error("Error updating finance settings:", error);
    res.status(500).json({ error: "Failed to update finance settings" });
  }
});

module.exports = router;
