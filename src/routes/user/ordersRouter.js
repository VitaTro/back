const express = require("express");
const router = express.Router();

const {
  sendAdminOrderNotification,
  sendAdminReturnNotification,
} = require("../../config/emailService");

const { authenticateUser } = require("../../middleware/authenticateUser");
const { getIo } = require("../../config/socket");

const StockMovement = require("../../schemas/accounting/stockMovement");
const User = require("../../schemas/userSchema");
const OnlineOrder = require("../../schemas/orders/onlineOrders");
const OnlineSale = require("../../schemas/sales/onlineSales");
const Product = require("../../schemas/product");
const Payment = require("../../schemas/paymentSchema");

const { calculateStock } = require("../../services/calculateStock");
const { createTpayTransaction } = require("../../services/tpayService");
const onlineOrders = require("../../schemas/orders/onlineOrders");

// ===============================
// GET USER ORDERS
// ===============================
router.get("/", authenticateUser, async (req, res) => {
  try {
    const userOrders = await OnlineOrder.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate(
        "products.productId",
        "name photoUrl price quantity color size width length",
      );

    res.status(200).json(userOrders);
  } catch {
    res.status(500).json({ error: "Failed to fetch user orders" });
  }
});

// ===============================
// CREATE NEW ORDER (UPDATED FOR DELIVERY TYPES)
// ===============================
router.post("/", authenticateUser, async (req, res) => {
  try {
    const {
      products,
      deliveryType, // "pickup" | "courier"
      parcelSize, // "small" | "medium" | "large"
      deliveryPrice,
      pickupPointId,
      deliveryAddress,
      country,
      notes,
    } = req.body;

    // Validate products
    if (!products || products.length === 0) {
      return res.status(400).json({ error: "Не передано товари" });
    }

    // Validate delivery type
    if (!deliveryType || !["pickup", "courier"].includes(deliveryType)) {
      return res.status(400).json({ error: "Invalid delivery type" });
    }

    // Validate parcel size
    if (!parcelSize) {
      return res.status(400).json({ error: "Parcel size is required" });
    }

    // Validate pickup
    if (deliveryType === "pickup" && !pickupPointId) {
      return res.status(400).json({ error: "Paczkomat is required" });
    }

    // Validate courier address
    if (deliveryType === "courier") {
      const requiredFields = [
        "fullName",
        "street",
        "houseNumber",
        "city",
        "postalCode",
      ];
      for (const field of requiredFields) {
        if (!deliveryAddress?.[field]) {
          return res
            .status(400)
            .json({ error: `Missing delivery address field: ${field}` });
        }
      }
    }

    // Process products
    const enrichedProducts = [];
    let totalPrice = 0;

    for (const item of products) {
      const lastMovement = await StockMovement.findOne({
        productId: item.productId,
        type: { $in: ["sale", "purchase"] },
      }).sort({ date: -1 });

      if (!lastMovement) {
        return res
          .status(400)
          .json({ error: `Немає рухів по товару ${item.productId}` });
      }

      const stockLevel = await calculateStock(lastMovement.productIndex);
      if (stockLevel < item.quantity) {
        return res.status(400).json({
          error: `Недостатньо на складі: ${lastMovement.productName}`,
        });
      }

      const product = await Product.findById(item.productId);

      const unitPrice =
        product?.lastRetailPrice ??
        lastMovement.unitSalePrice ??
        lastMovement.price ??
        product?.price ??
        lastMovement.unitPurchasePrice ??
        0;

      totalPrice += unitPrice * item.quantity;

      enrichedProducts.push({
        productId: item.productId,
        index: lastMovement.productIndex,
        name: lastMovement.productName,
        quantity: item.quantity,
        price: unitPrice,
        photoUrl: product?.photoUrl || "",
      });
    }

    // Shipping cost (from frontend)
    const shippingCost = deliveryPrice || 0;
    const totalQuantity = enrichedProducts.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const finalPrice = totalPrice + shippingCost;

    // Create order
    const newOrder = new OnlineOrder({
      userId: req.user.id,
      products: enrichedProducts,
      totalPrice,
      shippingCost,
      totalQuantity,
      finalPrice,
      paymentMethod: "tpay",

      deliveryType,
      parcelSize,
      deliveryPrice: shippingCost,

      pickupPointId: deliveryType === "pickup" ? pickupPointId : null,
      deliveryAddress: deliveryType === "courier" ? deliveryAddress : null,
      country,
      notes,
      status: "new",
    });

    await newOrder.save();

    // Create Tpay transaction
    const tpay = await createTpayTransaction({
      amount: finalPrice,
      orderId: newOrder.orderId,
      email: req.user.email,
      name:
        deliveryAddress?.fullName ||
        req.user.firstName + " " + req.user.lastName ||
        req.user.email,
    });

    if (!tpay) {
      return res
        .status(500)
        .json({ error: "Не вдалося створити транзакцію Tpay" });
    }

    newOrder.transactionId = tpay.transactionId;
    newOrder.paymentUrl = tpay.paymentUrl;
    await newOrder.save();

    await sendAdminOrderNotification(newOrder);

    res.status(201).json({
      message: "✅ Замовлення створено",
      order: newOrder,
      paymentUrl: tpay.paymentUrl,
    });
  } catch (error) {
    console.error("❌ Помилка створення замовлення:", error);
    res.status(500).json({
      error: error.message || "Не вдалося створити замовлення",
    });
  }
});

// ===============================
// RETURN REQUEST
// ===============================
router.put("/:orderId/return", authenticateUser, async (req, res) => {
  try {
    const { returnedProducts, refundAmount } = req.body;

    if (!returnedProducts?.length) {
      return res
        .status(400)
        .json({ error: "Не вибрано товари для повернення" });
    }

    const order = await OnlineOrder.findOne({
      _id: req.params.orderId,
      userId: req.user.id,
      status: { $in: ["completed", "paid", "shipped"] },
    });

    if (!order) {
      return res
        .status(404)
        .json({ error: "❌ Замовлення не підходить для повернення" });
    }

    let totalRefunded = 0;

    for (const returned of returnedProducts) {
      const originalItem = order.products.find(
        (p) => p.productId.toString() === returned.productId,
      );

      if (!originalItem) {
        return res.status(400).json({
          error: `❌ Товар не знайдено в замовленні: ${returned.productId}`,
        });
      }

      if (returned.quantity > originalItem.quantity) {
        return res.status(400).json({
          error: `🚫 Кількість повернення перевищує куплену для ${originalItem.name}`,
        });
      }

      await StockMovement.create({
        productId: originalItem.productId,
        productIndex: originalItem.index,
        productName: originalItem.name,
        quantity: returned.quantity,
        type: "return",
        unitPurchasePrice: originalItem.price,
        price: originalItem.price,
        saleSource: "OnlineSale",
        relatedSaleId: order._id,
        date: new Date(),
        note: "Повернення товару користувачем",
      });

      const productDoc = await Product.findById(originalItem.productId);
      if (productDoc) {
        const stockCount = await calculateStock(originalItem.index);
        productDoc.quantity = stockCount;
        productDoc.currentStock = stockCount;
        productDoc.inStock = stockCount > 0;
        await productDoc.save();
      }

      totalRefunded += returned.quantity * originalItem.price;
    }

    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (payment) {
      payment.status = "refunded";
      payment.refundAmount = refundAmount || totalRefunded;
      await payment.save();
    }

    order.status = "returned";
    order.refundAmount = refundAmount || totalRefunded;
    await order.save();

    await sendAdminReturnNotification(order);

    return res.status(200).json({
      message: "✅ Повернення успішно оброблено",
      order,
    });
  } catch (error) {
    console.error("🔥 Помилка обробки повернення:", error);
    return res.status(500).json({ error: "❌ Не вдалося обробити повернення" });
  }
});

// ===============================
// CONFIRM RECEIVED
// ===============================
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

// ===============================
// PURCHASE HISTORY
// ===============================
router.get("/purchase-history", authenticateUser, async (req, res) => {
  try {
    const { startDate, endDate, status, page = 1, limit = 25 } = req.query;

    const filter = { userId: req.user.id };

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const orders = await OnlineOrder.find(filter)
      .populate("products.productId", "name photoUrl price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalOrders = await OnlineOrder.countDocuments(filter);

    res.status(200).json({
      message: "Purchase history retrieved successfully",
      totalOrders,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalOrders / limit),
      orders,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch purchase history" });
  }
});
// ===============================
// GET SINGLE USER ORDER
// ===============================
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const order = await OnlineOrder.findOne({
      _id: req.params.id,
      userId: req.user.id,
    })
      .populate("products.productId", "name photoUrl price")
      .populate("pickupPointId")
      .populate("deliveryAddress");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

module.exports = router;
