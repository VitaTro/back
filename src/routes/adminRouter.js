const express = require("express");
const router = express.Router();
const User = require("../schemas/user");
const Product = require("../schemas/product");
const Wishlist = require("../schemas/wishlist");
// const { authenticateJWT } = require("../middleware/authMiddleware");

// Маршрут для отримання користувачів
router.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Маршрут для видалення користувача за ID
router.delete("/users/:id", async (req, res) => {
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

// Маршрут для створення нового продукту
router.post("/products", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ message: "Product created", product });
  } catch (error) {
    res.status(500).json({ error: "Failed to create product" });
  }
});

// Маршрут для оновлення продукту за ID
router.patch("/products/:id", async (req, res) => {
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
router.delete("/products/:id", async (req, res) => {
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
router.get("/dashboard", async (req, res) => {
  try {
    // Загальна статистика
    const stats = {
      totalUsers: await User.countDocuments(),
      totalProducts: await Product.countDocuments(),
      activeUsers: await User.countDocuments({ isActive: true }), // Приклад, якщо є поле isActive
      salesCount: 200, // Можна взяти з бази продажів
      netProfit: 15000.5, // Можна розрахувати з бази даних
    };

    // Огляд продуктів
    const lowStockItems = await Product.find({ stock: { $lt: 5 } }).select(
      "name stock"
    );
    const popularItems = [
      { name: "Gold Necklace", popularity: 95 },
      { name: "Silver Bracelet", popularity: 88 },
    ]; // Додати логіку для визначення популярності
    const wishlist = await Wishlist.find().populate("productId");

    // Фінансова статистика
    const financialOverview = {
      purchasePrices: [
        { name: "Gold Cross", purchasePrice: 100 },
        { name: "Silver Bracelet", purchasePrice: 50 },
      ], // Взяти з бази даних закупівель
      markupOverview: [
        { name: "Gold Cross", markup: 50 },
        { name: "Silver Bracelet", markup: 30 },
      ], // Розрахувати націнку
    };

    res.status(200).json({
      message: "Welcome to the dashboard, admin@example.com!",
      stats,
      productsOverview: {
        lowStockItems,
        popularItems,
      },
      wishlistOverview: wishlist.map((item) => ({
        name: item.name,
        count: item.quantity,
      })),
      financialOverview,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

// Маршрут для перевірки статусу адміністратора
// router.get("/check-admin", async (req, res) => {
//   try {
//     const admins = await User.find({ role: "admin" });
//     const isFirstAdmin = admins.length === 0;
//     res.status(200).json({ isFirstAdmin });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to check admin status" });
//   }
// });

module.exports = router;
