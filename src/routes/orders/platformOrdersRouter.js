const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

const PlatformOrder = require("../../schemas/orders/platformOrders");
const Product = require("../../schemas/product");
const StockMovement = require("../../schemas/accounting/stockMovement");
const { calculateStock } = require("../../services/calculateStock");
const { calculateDiscount } = require("../../services/discountCalculator");
// 🔹 GET: Всі платформені замовлення
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const orders = await PlatformOrder.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("🧨 Error fetching platform orders:", error);
    res.status(500).json({ error: "Failed to fetch platform orders" });
  }
});

// 🔹 GET: Замовлення за ID
router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const order = await PlatformOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    res.status(200).json(order);
  } catch (error) {
    console.error("🧨 Error fetching platform order by ID:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// 🔹 POST: Створити платформене замовлення
router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const {
      platform,
      externalOrderId,
      products,
      paymentMethod,
      notes,
      client,
      saleDate,
    } = req.body;

    const validPlatforms = ["allegro", "facebook", "instagram"];
    if (!validPlatforms.includes(platform)) {
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
            "❌ Allegro requires firstName, lastName, phone, and allegroClientId",
        });
      }
    }

    const enrichedProducts = [];
    let totalPrice = 0;

    for (const item of products) {
      const lastMovement = await StockMovement.findOne({
        productId: item.productId,
        type: { $in: ["sale", "purchase"] },
      }).sort({ date: -1 });

      if (
        !lastMovement ||
        !lastMovement.productIndex ||
        !lastMovement.productName
      ) {
        throw new Error(
          `❌ No stock movement found for product ${item.productId}`,
        );
      }

      const stockLevel = await calculateStock(lastMovement.productIndex);
      if (stockLevel < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for ${lastMovement.productName}`,
        });
      }

      const productDoc = await Product.findById(item.productId);
      const unitPrice =
        item.price ||
        lastMovement.unitSalePrice ||
        lastMovement.price ||
        productDoc?.lastRetailPrice ||
        lastMovement.unitPurchasePrice ||
        0;

      totalPrice += unitPrice * item.quantity;

      enrichedProducts.push({
        productId: item.productId,
        index: lastMovement.productIndex,
        name: lastMovement.productName,
        quantity: item.quantity,
        price: unitPrice,
        photoUrl: productDoc?.photoUrl || "",
        unitPurchasePrice: lastMovement.unitPurchasePrice || 0,
        margin: unitPrice - (lastMovement.unitPurchasePrice || 0),
        manualPrice: !!item.price,
        color: item.color || productDoc?.color || "",
        size: item.size || null,
        sku: item.sku || null,
      });
    }
    const { discount, discountPercent, final } = calculateDiscount(totalPrice);

    const order = await PlatformOrder.create({
      platform,
      externalOrderId,
      products: enrichedProducts,
      totalPrice,
      discount,
      discountPercent,
      finalPrice: final,
      paymentMethod,
      notes,
      client,
      saleDate,
      status: "pending",
    });

    res.status(201).json({ message: "Platform order created", order });
  } catch (error) {
    console.error("🔥 Error creating platform order:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to create platform order" });
  }
});

// 🔹 PATCH: Оновити статус платформного замовлення
router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const order = await PlatformOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.status(200).json({ message: "Order status updated", order });
  } catch (error) {
    console.error("🧨 Error updating platform order status:", error);
    res.status(500).json({ error: "Failed to update platform order" });
  }
});

module.exports = router;
