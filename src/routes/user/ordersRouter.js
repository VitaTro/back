const express = require("express");
const router = express.Router();

const { getAllPoints, trackShipment } = require("../../config/inpostService");
const {
  sendAdminOrderNotification,
  sendAdminReturnNotification,
} = require("../../config/emailService");
const { authenticateUser } = require("../../middleware/authenticateUser");
const { getIo } = require("../../config/socket");

const User = require("../../schemas/userSchema");
const OnlineOrder = require("../../schemas/finance/onlineOrders");
const OnlineSale = require("../../schemas/finance/onlineSales");
const Product = require("../../schemas/product");
const Payment = require("../../schemas/paymentSchema");
const FinanceOverview = require("../../schemas/finance/financeOverview");

// ✅ Отримати всі замовлення користувача
router.get("/", authenticateUser, async (req, res) => {
  try {
    const userOrders = await OnlineOrder.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json(userOrders);
  } catch {
    res.status(500).json({ error: "Failed to fetch user orders" });
  }
});

// ✅ Фільтрація по статусу
const createStatusRoute = (status) =>
  router.get(`/${status}`, authenticateUser, async (req, res) => {
    try {
      const orders = await OnlineOrder.find({ userId: req.user.id, status });
      res.status(200).json(orders);
    } catch {
      res.status(500).json({ error: `Failed to fetch ${status} orders` });
    }
  });

["unpaid", "processing", "shipped"].forEach(createStatusRoute);

// ✅ Створення нового замовлення
router.post("/", authenticateUser, async (req, res) => {
  try {
    const {
      products,
      totalPrice,
      paymentMethod,
      pickupPointId,
      postalCode,
      deliveryType,
      city,
      street,
      houseNumber,
      apartmentNumber,
      isPrivateHouse,
    } = req.body;

    if (!pickupPointId) {
      return res.status(400).json({ error: "Pickup point is required" });
    }
    const totalQuantity = products.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const user = await User.findById(req.user.id);
    const orderAddress = user.address?.postalCode
      ? user.address
      : {
          postalCode,
          city,
          street,
          houseNumber,
          apartmentNumber,
          isPrivateHouse,
        };

    if (
      !orderAddress.postalCode ||
      !orderAddress.city ||
      !orderAddress.street ||
      !orderAddress.houseNumber
    ) {
      return res
        .status(400)
        .json({ error: "Address is required to place an order" });
    }
    console.log("🧪 Order to be created:", {
      userId: req.user.id,
      products,
      totalPrice,
      deliveryType,
      paymentMethod,
      pickupPointId,
      ...orderAddress,
    });

    const newOrder = await OnlineOrder.create({
      userId: req.user.id,
      products,
      totalPrice,
      totalQuantity,
      paymentMethod,
      pickupPointId,
      deliveryType,
      ...orderAddress,
      status: "new",
    });

    await sendAdminOrderNotification(newOrder);

    res
      .status(201)
      .json({ message: "Order created successfully", order: newOrder });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ error: error.message || "Failed to create order" });
  }
});

// ✅ Запит на повернення
router.put("/:orderId/return", authenticateUser, async (req, res) => {
  try {
    const { returnedProducts, refundAmount } = req.body;

    const order = await OnlineOrder.findOne({
      _id: req.params.orderId,
      userId: req.user.id,
      status: "paid",
    });
    if (!order)
      return res.status(404).json({ error: "Order not eligible for return" });
    if (!returnedProducts?.length)
      return res.status(400).json({ error: "No products selected" });

    await Promise.all(
      returnedProducts.map((product) =>
        Product.updateOne(
          { _id: product.productId },
          { $inc: { stock: product.quantity } }
        )
      )
    );

    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (payment) {
      payment.status = "refunded";
      payment.refundAmount = refundAmount;
      await payment.save();
    }

    order.status = "returned";
    order.refundAmount = refundAmount;
    await order.save();

    await sendAdminReturnNotification(order);

    res.status(200).json({ message: "Return processed successfully", order });
  } catch {
    res.status(500).json({ error: "Failed to process return" });
  }
});

// ✅ Користувач підтверджує отримання
router.patch("/:id/received", authenticateUser, async (req, res) => {
  try {
    const order = await OnlineOrder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "shipped")
      return res.status(400).json({ error: "Order not ready" });

    order.status = "completed";
    order.statusHistory.push({
      status: "completed",
      updatedBy: req.user.id,
      updatedAt: new Date(),
    });

    await order.save();
    getIo().emit("adminOrderUpdate", {
      orderId: order._id,
      status: "completed",
    });

    res.status(200).json({ message: "Order marked as received", order });
  } catch {
    res.status(500).json({ error: "Failed to confirm received" });
  }
});

// ✅ Історія покупок
router.get("/purchase-history", authenticateUser, async (req, res) => {
  try {
    const { startDate, endDate, status, page = 1, limit = 25 } = req.query;
    const filter = { userId: req.user.id };

    if (startDate && endDate) {
      filter.saleDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const purchaseHistory = await OnlineSale.find(filter)
      .populate("onlineOrderId", "totalAmount paymentMethod saleDate status")
      .populate("products.productId", "name photoUrl price quantity")
      .sort({ saleDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await OnlineSale.countDocuments(filter);

    if (!purchaseHistory.length) {
      return res.status(404).json({ error: "No purchase history found" });
    }

    res.status(200).json({
      message: "Purchase history retrieved successfully",
      totalOrders,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalOrders / limit),
      purchaseHistory,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch purchase history" });
  }
});

// ✅ Отримання поштоматів
router.get("/pickup-points", authenticateUser, async (req, res) => {
  try {
    const pickupPoints = await getAllPoints();
    if (!pickupPoints?.length)
      return res.status(404).json({ error: "No pickup points found" });

    res.status(200).json({ points: pickupPoints });
  } catch (error) {
    console.error("Pickup points error:", error);
    res.status(500).json({ error: "Failed to fetch pickup points" });
  }
});

// ✅ Трекінг доставки
router.get("/track/:trackingNumber", authenticateUser, async (req, res) => {
  try {
    const shipmentStatus = await trackShipment(req.params.trackingNumber);
    if (!shipmentStatus)
      return res.status(404).json({ error: "Tracking number not found" });

    res.status(200).json(shipmentStatus);
  } catch {
    res.status(500).json({ error: "Failed to fetch tracking status" });
  }
});

module.exports = router;
