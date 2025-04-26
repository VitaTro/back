const express = require("express");
const router = express.Router();
const User = require("../schemas/user");
const Product = require("../schemas/product");
const Wishlist = require("../schemas/wishlist");
const Order = require("../schemas/order");
const AdminOrder = require("../schemas/adminOrder");
const Sale = require("../schemas/sale");
const orderValidationSchema = require("../validation/ordersJoi");
const { validate } = require("../middleware/validateMiddleware");
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

router.get("/finance/orders", async (req, res) => {
  try {
    const orders = await Order.find().populate("productId").populate("userId");
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error in fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.post("/finance/orders", async (req, res) => {
  try {
    const { products, paymentMethod } = req.body;

    let totalPrice = 0;
    const orderProducts = [];

    for (const product of products) {
      const { productId, quantity, color } = product;
      const dbProduct = await Product.findById(productId);

      if (!dbProduct || dbProduct.quantity < quantity) {
        return res.status(400).json({
          message: `Продукт ${productId} не доступний або недостатня кількість.`,
        });
      }

      totalPrice += dbProduct.price * quantity;

      orderProducts.push({
        productId: dbProduct._id,
        name: dbProduct.name,
        price: dbProduct.price,
        quantity,
        color, // Додаємо колір до продукту
        photoUrl: dbProduct.photoUrl,
      });

      dbProduct.quantity -= quantity;
      await dbProduct.save();
    }
    if (dbProduct.quantity < 0) {
      dbProduct.quantity = 0; // Запобігання негативним значенням
    }

    const newAdminOrder = new AdminOrder({
      products: orderProducts,
      totalPrice,
      paymentMethod,
      status: "pending-payment",
    });

    await newAdminOrder.save();

    res.status(201).json({
      message: "Admin order created successfully.",
      order: newAdminOrder,
    });
  } catch (error) {
    console.error("Error creating admin order:", error);
    res.status(500).json({ error: "Failed to create admin order" });
  }
});

router.get("/finance/orders/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("productId")
      .populate("userId");
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.status(200).json(order);
  } catch (error) {
    console.error("Error in fetching order:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

router.patch(
  "/finance/orders/:id",
  validate(orderValidationSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["new", "completed", "cancelled"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      if (!updatedOrder) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.status(200).json(updatedOrder); // Повертаємо оновлене замовлення
    } catch (error) {
      console.error("Error in updating order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  }
);

// Отримати всі продажі
router.get("/finance/sale", async (req, res) => {
  try {
    const sales = await Sale.find();
    res.status(200).json(sales);
  } catch (error) {
    console.error("Error in fetching sales:", error);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

// Додати новий запис продажу
router.post("/finance/sale", async (req, res) => {
  try {
    const { productId, quantity, salePrice } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      return res
        .status(400)
        .json({ error: "Product ID and positive quantity are required." });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    if (product.quantity < quantity) {
      return res.status(400).json({
        error: `Not enough stock for product: ${product.name}. Available: ${product.quantity}, Requested: ${quantity}.`,
      });
    }

    // Розраховуємо підсумкову ціну
    const totalAmount = product.price * quantity;

    // Створюємо новий продаж
    const newSale = new Sale({
      productId,
      quantity,
      salePrice,
      totalAmount,
    });

    // Оновлюємо кількість товару на складі
    product.quantity -= quantity;
    await product.save();

    await newSale.save();
    res
      .status(201)
      .json({ message: "Sale recorded successfully", sale: newSale });
  } catch (error) {
    console.error("Error in recording sale:", error);
    res.status(500).json({ error: "Failed to record sale" });
  }
});

// Оновити інформацію про продаж
router.patch("/finance/sale/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const sale = await Sale.findByIdAndUpdate(id, updatedData, { new: true });

    if (!sale) {
      return res.status(404).json({ error: "Sale not found." });
    }

    res.status(200).json({ message: "Sale updated successfully", sale });
  } catch (error) {
    console.error("Error in updating sale:", error);
    res.status(500).json({ error: "Failed to update sale" });
  }
});

router.get("/finance/overview", async (req, res) => {
  try {
    // Загальна статистика
    const stats = {
      totalUsers: await User.countDocuments(),
      totalProducts: await Product.countDocuments(),
      totalOrders: await Order.countDocuments(),
      totalSales: await Sale.countDocuments(),
    };

    // Дані продуктів (закупки, низький залишок, популярні товари)
    const productsOverview = {
      purchasePrices: await Product.find().select(
        "name purchasePrice photo index"
      ),
      markupOverview: await Product.find().select("name markup photo index"),
      lowStockItems: await Product.find({ stock: { $lt: 5 } }).select(
        "name stock photo index"
      ),
      popularItems: [
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
      ],
    };

    // Дані продажів (загальний продаж та прибуток)
    const salesData = await Sale.aggregate([
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          totalProfit: { $sum: "$salePrice" },
        },
      },
    ]);

    const salesOverview = salesData.length
      ? {
          salesCount: salesData[0].totalSales,
          netProfit: salesData[0].totalProfit,
        }
      : { salesCount: 0, netProfit: 0 };

    // Дані замовлень
    const orders = await Order.find().populate("productId").lean();
    const ordersOverview = orders.map((order) => ({
      orderId: order._id,
      status: order.status,
      totalPrice: order.totalPrice,
      paymentStatus: order.paymentStatus,
      deliveryAddress: order.deliveryAddress,
      notes: order.notes,
    }));

    // Wishlist (якщо необхідно)
    const wishlist = await Wishlist.find().populate("productId");
    const wishlistOverview = wishlist.map((item) => ({
      name: item.productId.name,
      count: item.quantity,
      photo: item.productId.photo,
      index: item.productId.index,
    }));

    // Формуємо фінансовий огляд
    const financialOverview = {
      stats,
      productsOverview,
      salesOverview,
      ordersOverview,
      wishlistOverview,
    };

    res.status(200).json(financialOverview);
  } catch (error) {
    console.error("Error in /finance/overview route:", error);
    res.status(500).json({ error: "Failed to load financial overview" });
  }
});

module.exports = router;
