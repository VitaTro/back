const express = require("express");
const router = express.Router();
const { getPoints, trackShipment } = require("../../config/inpostService");

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
    const { products, totalPrice, paymentMethod, pickupPointId } = req.body;

    if (!pickupPointId) {
      return res.status(400).json({ error: "Pickup point is required" });
    }

    const pickupPoint = await getPoints();
    const selectedPoint = pickupPoint.items.find(
      (p) => p.name === pickupPointId
    );

    if (!selectedPoint) {
      return res.status(404).json({ error: "Invalid pickup point ID" });
    }

    const newOrder = await OnlineOrder.create({
      userId: req.user.id,
      products,
      totalPrice,
      paymentMethod,
      pickupPointId,
      postalCode: user.address.postalCode, // Беремо адресу з профілю
      city: user.address.city,
      street: user.address.street,
      houseNumber: user.address.houseNumber,
      apartmentNumber: user.address.apartmentNumber,
      isPrivateHouse: user.address.isPrivateHouse,
      status: "new",
    });

    res
      .status(201)
      .json({ message: "Order created successfully", order: newOrder });
  } catch (error) {
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
    });

    if (!order) return res.status(404).json({ error: "Order not found" });

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

    order.status = "returned";
    order.refundAmount = refundAmount;
    await order.save();
    await sendAdminReturnNotification(order);
    res.status(200).json({ message: "Return processed successfully", order });
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

router.get("/pickup-points", authenticateUser, async (req, res) => {
  try {
    const pickupPoints = await getPoints(); // Виклик API або бази даних для отримання поштоматів

    if (!pickupPoints || !pickupPoints.items.length) {
      return res.status(404).json({ error: "No pickup points found" });
    }

    res.status(200).json({ points: pickupPoints.items });
  } catch (error) {
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
