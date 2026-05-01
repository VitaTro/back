const express = require("express");
const router = express.Router();
const User = require("../schemas/userSchema");
const Product = require("../schemas/product");
const Wishlist = require("../schemas/wishlist");
const { sendAdminMessage } = require("../config/emailService");
const { authenticateAdmin } = require("../middleware/authenticateAdmin");
const { authenticateUser } = require("../middleware/authenticateUser");
const Analytics = require("../schemas/Analytics");
// Маршрут для отримання користувачів
router.get("/users", authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Маршрут для видалення користувача за ID
router.delete("/users/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await User.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: `User with ID ${id} deleted` });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

router.get("/products", authenticateAdmin, async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Маршрут для створення нового продукту
router.post("/products", authenticateAdmin, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res
      .status(201)
      .json({ id: product._id, message: "Product added successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to create product" });
  }
});

// Маршрут для оновлення продукту за ID
router.patch("/products/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product updated", updatedProduct });
  } catch (error) {
    res.status(500).json({ error: "Failed to update product" });
  }
});

// Маршрут для видалення продукту за ID
router.delete("/products/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Product.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: `Product with ID ${id} deleted` });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Маршрут для адмін-панелі
router.get("/dashboard", authenticateAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const date7 = new Date();
    date7.setDate(date7.getDate() - 7);
    const last7 = date7.toISOString().slice(0, 10);

    const date30 = new Date();
    date30.setDate(date30.getDate() - 30);
    const last30 = date30.toISOString().slice(0, 10);
    // Загальна статистика
    const stats = {
      totalUsers: await User.countDocuments(),
      totalProducts: await Product.countDocuments(),
      activeUsers: await User.countDocuments({ isActive: true }),
    };
    const visitsToday = await Analytics.aggregate([
      { $match: { date: today } },
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]);

    // === ВІЗИТИ ЗА 7 ДНІВ ===
    const visits7days = await Analytics.aggregate([
      { $match: { date: { $gte: last7 } } },
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]);

    // === ВІЗИТИ ЗА 30 ДНІВ ===
    const visits30days = await Analytics.aggregate([
      { $match: { date: { $gte: last30 } } },
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]);

    // === ВСІ ВІЗИТИ ===
    const visitsTotal = await Analytics.aggregate([
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]);

    // === ГРАФІК ЗА 30 ДНІВ ===
    const visitsGraphData = await Analytics.aggregate([
      { $match: { date: { $gte: last30 } } },
      { $group: { _id: "$date", total: { $sum: "$count" } } },
      { $sort: { _id: 1 } },
    ]);

    // === ТОП СТОРІНОК ===
    const topPages = await Analytics.aggregate([
      { $group: { _id: "$page", total: { $sum: "$count" } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    await Analytics.deleteMany({ date: { $lt: last30 } });

    const lowStockItems = await Product.find({ quantity: { $lte: 1 } }).select(
      "name quantity photo index",
    );
    const popularItems = await Product.find()
      .sort({ popularity: -1 })
      .limit(10)
      .select("name popularity photoUrl index");

    const wishlist = await Wishlist.find().populate("productId");

    res.status(200).json({
      message: "Welcome to the dashboard, admin@example.com!",
      stats: {
        ...stats,
        visitsToday: visitsToday[0]?.total || 0,
        visits7days: visits7days[0]?.total || 0,
        visits30days: visits30days[0]?.total || 0,
        visitsTotal: visitsTotal[0]?.total || 0,
      },
      analyticsOverview: {
        graph: visitsGraphData.map((i) => ({
          date: i._id,
          count: i.total,
        })),
        topPages: topPages.map((i) => ({
          page: i._id,
          count: i.total,
        })),
      },
      productsOverview: {
        lowStockItems,
        popularItems,
      },
      wishlistOverview: wishlist.map((item) => ({
        name: item.productId.name,
        count: item.quantity,
        photo: item.productId.photo,
        index: item.productId.index,
      })),
    });
  } catch (error) {
    console.error("Error in /dashboard route:", error);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

router.post("/email", authenticateUser, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message)
      return res
        .status(400)
        .json({ error: "Należy podać temat i treść wiadomości" });

    await sendAdminMessage(subject, message);

    res
      .status(201)
      .json({ message: "List do administratora został pomyślnie wysłany!" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Nie udało się wysłać wiadomości do administratora." });
  }
});
router.get("/analytics/stats", authenticateAdmin, async (req, res) => {
  try {
    const stats = await Analytics.find().sort({ date: -1 });
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch analytics stats" });
  }
});

module.exports = router;
