const express = require("express");
const router = express.Router();
const User = require("../schemas/user");
const Product = require("../schemas/product");
const Wishlist = require("../schemas/wishlist");
const Order = require("../schemas/order");
const Sale = require("../schemas/sale");
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

router.get("/finance", async (req, res) => {
  try {
    // Фінансовий огляд
    const financialOverview = {
      purchasePrices: await Product.find().select(
        "name purchasePrice photo index"
      ),
      markupOverview: await Product.find().select("name markup photo index"),
    };

    // Продажі та дохід
    const salesData = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          totalProfit: { $sum: "$salePrice" },
        },
      },
    ]);

    const orders = await Order.find().populate("productId").lean();
    if (!orders.length) {
      return res
        .status(200)
        .json({ message: "Немає доступних замовлень", orders: [] });
    }

    res.status(200).json({
      financialOverview,
      salesData: salesData.length
        ? {
            salesCount: salesData[0].totalSales,
            netProfit: salesData[0].totalProfit,
          }
        : { salesCount: 0, netProfit: 0 },
      ordersOverview: orders.map((order) => ({
        orderId: order._id,
        status: order.status,
        totalPrice: order.totalPrice,
        paymentStatus: order.paymentStatus,
        deliveryAddress: order.deliveryAddress,
        notes: order.notes,
      })),
    });
  } catch (error) {
    console.error("Error in /finance route:", error);
    res.status(500).json({ error: "Failed to load financial data" });
  }
});

// router.get("/dashboard", async (req, res) => {
//   try {
//     // Загальна статистика
//     const stats = {
//       totalUsers: await User.countDocuments(),
//       totalProducts: await Product.countDocuments(),
//       activeUsers: await User.countDocuments({ isActive: true }), // Приклад, якщо є поле isActive
//       salesCount: 200, // Можна взяти з бази продажів
//       netProfit: 15000.5, // Можна розрахувати з бази даних
//     };

//     // Огляд продуктів
//     const lowStockItems = await Product.find({ stock: { $lt: 5 } }).select(
//       "name stock"
//     );
//     const popularItems = [
//       { name: "Gold Necklace", popularity: 95 },
//       { name: "Silver Bracelet", popularity: 88 },
//     ]; // Додати логіку для визначення популярності
//     const wishlist = await Wishlist.find().populate("productId");

//     // Фінансова статистика
//     const financialOverview = {
//       purchasePrices: [
//         { name: "Gold Cross", purchasePrice: 100 },
//         { name: "Silver Bracelet", purchasePrice: 50 },
//       ], // Взяти з бази даних закупівель
//       markupOverview: [
//         { name: "Gold Cross", markup: 50 },
//         { name: "Silver Bracelet", markup: 30 },
//       ], // Розрахувати націнку
//     };

//     res.status(200).json({
//       message: "Welcome to the dashboard, admin@example.com!",
//       stats,
//       productsOverview: {
//         lowStockItems,
//         popularItems,
//       },
//       wishlistOverview: wishlist.map((item) => ({
//         name: item.name,
//         count: item.quantity,
//       })),
//       financialOverview,
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to load dashboard data" });
//   }
// });

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
