const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../../middleware/authenticateMiddleware");
const OnlineOrder = require("../../schemas/finance/onlineOrders");
const OnlineSale = require("../../schemas/finance/onlineSales");
const Product = require("../../schemas/product");
const FinanceOverview = require("../../schemas/finance/financeOverview");

// 🔐 Захищаємо всі маршрути для користувачів
router.use(isAuthenticated);

// ✅ Користувач отримує свої замовлення
router.get("/", async (req, res) => {
  try {
    const userOrders = await OnlineOrder.find({ userId: req.user.id })
      .populate("products.productId", "name photoUrl")
      .sort({ createdAt: -1 });

    res.status(200).json(userOrders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user orders" });
  }
});

// ✅ Користувач створює нове замовлення
router.post("/", async (req, res) => {
  try {
    const {
      products,
      totalPrice,
      paymentMethod,
      deliveryType,
      deliveryAddress,
    } = req.body;

    const newOrder = await OnlineOrder.create({
      userId: req.user.id,
      products,
      totalPrice,
      paymentMethod,
      deliveryType: deliveryType || "courier",
      deliveryAddress,
      status: "new",
    });

    res
      .status(201)
      .json({ message: "Order created successfully", order: newOrder });
  } catch (error) {
    res.status(500).json({ error: "Failed to create order" });
  }
});

// ✅ Користувач повертає товар
router.put("/:id/return", async (req, res) => {
  try {
    const { returnedProducts, refundAmount } = req.body;

    const onlineOrder = await OnlineOrder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!onlineOrder) return res.status(404).json({ error: "Order not found" });

    if (!returnedProducts || returnedProducts.length === 0) {
      return res.status(400).json({ error: "No products selected for return" });
    }

    // 🔄 Повертаємо товари на склад
    await Promise.all(
      returnedProducts.map(async (product) => {
        await Product.updateOne(
          { _id: product.productId },
          { $inc: { stock: product.quantity } }
        );
      })
    );

    // 💰 Оновлення фінансів
    await FinanceOverview.updateOne(
      {},
      { $inc: { totalRevenue: -refundAmount } }
    );

    onlineOrder.status = "returned";
    onlineOrder.refundAmount = refundAmount;
    await onlineOrder.save();

    res
      .status(200)
      .json({ message: "Return processed successfully", order: onlineOrder });
  } catch (error) {
    res.status(500).json({ error: "Failed to process return" });
  }
});

// ✅ Користувач отримує історію покупок
router.get("/purchase-history", async (req, res) => {
  try {
    const purchaseHistory = await OnlineSale.find({ userId: req.user.id })
      .populate("orderId", "totalAmount paymentMethod saleDate")
      .sort({ saleDate: -1 });

    if (!purchaseHistory.length) {
      return res.status(404).json({ error: "No purchase history found" });
    }

    res.status(200).json(purchaseHistory);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch purchase history" });
  }
});

module.exports = router;
