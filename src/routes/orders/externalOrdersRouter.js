const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");
const PlatformOrder = require("../../schemas/orders/platformOrders");
const Product = require("../../schemas/product");
const StockMovement = require("../../schemas/accounting/stockMovement");

router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const {
      platform,
      externalOrderId,
      products,
      platformFee = 0,
      paymentMethod = "platform_auto",
      notes,
      client,
    } = req.body;
    if (!["allegro", "facebook", "instagram"].includes(platform)) {
      return res.status(400).json({ error: "Invalid platform" });
    }
    if (platform === "allegro") {
      if (
        !client?.firstName?.trim() ||
        !client?.lastName?.trim() ||
        !client?.phone?.trim() ||
        !client?.allegroClientId?.trim()
      ) {
        return res.status(400).json({
          error:
            "❌ Для Allegro потрібно вказати ім’я, номер телефону та Allegro ID клієнта",
        });
      }
    }

    const enrichedProducts = [];
    let totalPrice = 0;

    for (const item of products) {
      const productData = await Product.findById(item.productId);
      if (!productData) {
        return res
          .status(404)
          .json({ error: `Product not found: ${item.productId}` });
      }

      const lastPurchase = await StockMovement.findOne({
        productId: item.productId,
        type: { $in: ["purchase", "restock"] },
      }).sort({ date: -1 });

      const purchasePrice = lastPurchase?.unitPurchasePrice || 0;

      enrichedProducts.push({
        productId: item.productId,
        index: item.index || productData.index,
        name: item.name || productData.name,
        photoUrl: productData.photoUrl || "",
        quantity: item.quantity,
        price: item.price, // ціна продажу вводиться вручну
        color: item.color || productData.color,
        unitPurchasePrice: purchasePrice,
        margin: item.price - purchasePrice,
      });

      totalPrice += item.price * item.quantity;
    }

    const newOrder = await PlatformOrder.create({
      platform,
      externalOrderId,
      products: enrichedProducts,
      totalPrice,
      platformFee,
      paymentMethod,
      notes,
      client,
      status: "pending",
    });

    res
      .status(201)
      .json({ message: "Platform order created", order: newOrder });
  } catch (error) {
    console.error("🚨 Error creating platform order:", error);
    res.status(500).json({ error: error.message || "Failed to create order" });
  }
});

router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const orders = await PlatformOrder.find().sort({ createdAt: -1 });
    res.status(200).json({ orders });
  } catch (error) {
    console.error("🚨 Error fetching platform orders:", error);
    res.status(500).json({ error: "Failed to retrieve orders" });
  }
});
router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const order = await PlatformOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.status(200).json({ order });
  } catch (error) {
    console.error("🚨 Error fetching platform order:", error);
    res.status(500).json({ error: "Failed to retrieve order" });
  }
});
router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "⛔ Невалідний статус" });
    }

    const order = await PlatformOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: "❌ Замовлення не знайдено" });
    }

    res.status(200).json({ message: "✅ Статус оновлено", order });
  } catch (error) {
    console.error("🔥 Помилка при оновленні статусу:", error);
    res.status(500).json({ error: "Не вдалося оновити статус замовлення" });
  }
});

module.exports = router;
