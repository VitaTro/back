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
    } = req.body;
    if (!["allegro", "etsy", "ebay", "amazon"].includes(platform)) {
      return res.status(400).json({ error: "Invalid platform" });
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
module.exports = router;
