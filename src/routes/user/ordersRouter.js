const express = require("express");
const router = express.Router();
const { getAllPoints, trackShipment } = require("../../config/inpostService");
const User = require("../../schemas/userSchema");
const { authenticateUser } = require("../../middleware/authenticateUser");
const OnlineOrder = require("../../schemas/finance/onlineOrders");
const OnlineSale = require("../../schemas/finance/onlineSales");
const Product = require("../../schemas/product");
const FinanceOverview = require("../../schemas/finance/financeOverview");
const {
  sendAdminOrderNotification,
  sendAdminReturnNotification,
} = require("../../config/emailService");

router.get("/", authenticateUser, async (req, res) => {
  try {
    const userOrders = await OnlineOrder.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json(userOrders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user orders" });
  }
});

// ✅ Фільтр: неоплачені замовлення
router.get("/unpaid", authenticateUser, async (req, res) => {
  try {
    const unpaidOrders = await OnlineOrder.find({
      userId: req.user.id,
      status: "unpaid",
    });
    res.status(200).json(unpaidOrders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch unpaid orders" });
  }
});

// ✅ Фільтр: оброблювані замовлення
router.get("/processing", authenticateUser, async (req, res) => {
  try {
    const processingOrders = await OnlineOrder.find({
      userId: req.user.id,
      status: "processing",
    });
    res.status(200).json(processingOrders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch processing orders" });
  }
});

// ✅ Фільтр: надіслані замовлення
router.get("/shipped", authenticateUser, async (req, res) => {
  try {
    const shippedOrders = await OnlineOrder.find({
      userId: req.user.id,
      status: "shipped",
    });
    res.status(200).json(shippedOrders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch shipped orders" });
  }
});

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

    // const pickupPoint = await getPoints();
    // const selectedPoint = pickupPoint.items.find(
    //   (p) => p.name === pickupPointId
    // );

    // if (!selectedPoint) {
    //   return res.status(404).json({ error: "Invalid pickup point ID" });
    // }

    // 📌 Перевіряємо профіль користувача
    const user = await User.findById(req.user.id);

    const orderAddress = user.address?.postalCode
      ? user.address // Використовуємо адресу з профілю
      : {
          postalCode,
          city,
          street,
          houseNumber,
          apartmentNumber,
          isPrivateHouse,
        }; // Використовуємо введені дані

    // 📌 Перевіряємо, чи всі обов’язкові поля адреси заповнені
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

    const newOrder = await OnlineOrder.create({
      userId: req.user.id,
      products,
      totalPrice,
      paymentMethod,
      pickupPointId,
      deliveryType,
      ...orderAddress, // Передаємо адресу
      status: "new",
    });

    res
      .status(201)
      .json({ message: "Order created successfully", order: newOrder });
  } catch (error) {
    console.error("❌ Order creation error:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});
// ❌ Запит на повернення замовлення
router.put("/:orderId/return", authenticateUser, async (req, res) => {
  try {
    const { returnedProducts, refundAmount } = req.body;

    const order = await OnlineOrder.findOne({
      _id: req.params.orderId,
      userId: req.user.id,
      status: "paid",
    });

    if (!order)
      return res
        .status(404)
        .json({ error: "Order not found or not eligible for return" });

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

    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (payment) {
      payment.status = "refunded"; // Оновлюємо статус
      payment.refundAmount = refundAmount;
      await payment.save();
    }

    order.status = "returned";
    order.refundAmount = refundAmount;
    await order.save();

    res
      .status(200)
      .json({ message: "Return processed successfully with refund", order });
  } catch (error) {
    res.status(500).json({ error: "Failed to process return" });
  }
});

// ✅ Користувач підтверджує отримання товару
// пізніше підв'язати апі
router.patch(
  "/:id/received",
  authenticateUser,

  async (req, res) => {
    try {
      const order = await OnlineOrder.findOne({
        _id: req.params.id,
        userId: req.user.id,
      });

      if (!order) return res.status(404).json({ error: "Order not found" });

      if (order.status !== "shipped") {
        return res
          .status(400)
          .json({ error: "Order is not ready to be completed" });
      }

      order.status = "completed";
      order.statusHistory.push({
        status: "completed",
        updatedBy: req.user.id,
        updatedAt: new Date(),
      });

      await order.save();

      // 🔄 **Оновлення адмінської сторони**
      io.emit("adminOrderUpdate", { orderId: order._id, status: "completed" });

      res.status(200).json({ message: "Order marked as received", order });
    } catch (error) {
      res.status(500).json({ error: "Failed to confirm order received" });
    }
  }
);

// ✅ Історія покупок
router.get("/purchase-history", authenticateUser, async (req, res) => {
  try {
    const { startDate, endDate, status, page = 1, limit = 25 } = req.query; // ✅ Додаємо пагінацію

    let filter = { userId: req.user.id };

    if (startDate && endDate) {
      filter.saleDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (status) {
      filter.status = status; // ✅ Фільтр за статусом
    }

    const skip = (page - 1) * limit;

    const purchaseHistory = await OnlineSale.find(filter)
      .populate("orderId", "totalAmount paymentMethod saleDate status") // ✅ Додаємо статус
      .populate("products", "name price quantity")
      .sort({ saleDate: -1 })
      .skip(skip)
      .limit(parseInt(limit)); // ✅ Додаємо `limit` та `skip`

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
  } catch (error) {
    console.error("❌ Purchase history error:", error);
    res.status(500).json({ error: "Failed to fetch purchase history" });
  }
});

router.get("/pickup-points", authenticateUser, async (req, res) => {
  try {
    const pickupPoints = await getAllPoints();
    if (!pickupPoints || pickupPoints.length === 0) {
      return res.status(404).json({ error: "No pickup points found" });
    }

    res.status(200).json({ points: pickupPoints });
  } catch (error) {
    console.error("❌ Помилка отримання поштоматів:", error); // 🔍 Виводимо повний лог
    res.status(500).json({ error: "Failed to fetch pickup points" });
  }
});

router.get("/track/:trackingNumber", authenticateUser, async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const shipmentStatus = await trackShipment(trackingNumber);

    if (!shipmentStatus) {
      return res.status(404).json({ error: "Tracking number not found" });
    }

    res.status(200).json(shipmentStatus);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tracking status" });
  }
});
module.exports = router;
