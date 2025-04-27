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

router.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Маршрут для створення нового продукту
router.post("/products", async (req, res) => {
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
      activeUsers: await User.countDocuments({ isActive: true }),
    };

    // Огляд продуктів
    const lowStockItems = await Product.find({ stock: { $lt: 5 } }).select(
      "name stock photo index"
    );
    const popularItems = [
      {
        name: "Gold Necklace",
        popularity: 95,
        photo: "/path/to/photo1.jpg",
        index: "GN-123",
      },
      {
        name: "Silver Bracelet",
        popularity: 88,
        photo: "/path/to/photo2.jpg",
        index: "SB-456",
      },
    ]; // Логіка для визначення популярності
    const wishlist = await Wishlist.find().populate("productId");

    res.status(200).json({
      message: "Welcome to the dashboard, admin@example.com!",
      stats,
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

module.exports = router;
