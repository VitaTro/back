const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

const PlatformOrder = require("../../schemas/orders/platformOrders");
const PlatformSale = require("../../schemas/sales/platformSales");
const Product = require("../../schemas/product");
const StockMovement = require("../../schemas/accounting/stockMovement");
const FinanceOverview = require("../../schemas/finance/financeOverview");

const { calculateStock } = require("../../services/calculateStock");

router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const { orderId, saleDate } = req.body;

    const order = await PlatformOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "❌ Замовлення не знайдено" });
    }

    if (order.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Замовлення вже виконано або скасовано" });
    }

    const enrichedProducts = [];
    let totalAmount = 0;

    for (const item of order.products) {
      const productDoc = await Product.findById(item.productId);
      if (!productDoc) {
        return res
          .status(404)
          .json({ error: `❌ Продукт не знайдено: ${item.productId}` });
      }

      const stockLevel = await calculateStock(productDoc.index);
      if (stockLevel < item.quantity) {
        return res.status(400).json({
          error: `Недостатньо ${productDoc.name} на складі`,
        });
      }

      const unitPrice =
        item.unitPrice || productDoc.lastRetailPrice || productDoc.price || 0;

      totalAmount += unitPrice * item.quantity;

      enrichedProducts.push({
        productId: item.productId,
        index: productDoc.index,
        name: productDoc.name,
        quantity: item.quantity,
        price: unitPrice,
        photoUrl: productDoc.photoUrl || "",
      });
    }

    const sale = await PlatformSale.create({
      orderId,
      products: enrichedProducts,
      totalAmount,
      paymentMethod: order.paymentMethod,
      platformName: order.platform,
      status: "completed",
      saleDate: saleDate || new Date(),
      client: {
        firstName: order.client.firstName,
        lastName: order.client.lastName,
        phone: order.client.phone,
        allegroClientId: order.client.allegroClientId,
      },
    });

    for (const product of enrichedProducts) {
      await StockMovement.create({
        productId: product.productId,
        productIndex: product.index,
        productName: product.name,
        quantity: product.quantity,
        type: "sale",
        unitSalePrice: product.price,
        price: product.price,
        relatedSaleId: sale._id,
        saleSource: "PlatformSale",
        date: sale.saleDate,
        note: "Списання при платформеному продажу",
      });

      const productDoc = await Product.findById(product.productId);
      const updatedStock = await calculateStock(product.index);
      productDoc.quantity = updatedStock;
      productDoc.currentStock = updatedStock;
      productDoc.inStock = updatedStock > 0;
      await productDoc.save();
    }

    await FinanceOverview.updateOne(
      {},
      {
        $inc: { totalRevenue: totalAmount },
        $push: { completedSales: sale._id },
      },
      { upsert: true }
    );

    order.status = "completed";
    await order.save();

    res.status(201).json({
      message: "📦 Платформений продаж створено",
      sale,
    });
  } catch (error) {
    console.error("🔥 Platform sale error:", error);
    res
      .status(500)
      .json({ error: error.message || "Помилка платформи-продажу" });
  }
});
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const sales = await PlatformSale.find().sort({ saleDate: -1 });
    res.status(200).json({ sales });
  } catch (error) {
    console.error("🔥 Error fetching platform sales:", error);
    res.status(500).json({ error: "Не вдалося отримати дані продажів" });
  }
});
router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const sale = await PlatformSale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ error: "❌ Продаж не знайдено" });
    }
    res.status(200).json({ sale });
  } catch (error) {
    console.error("🔥 Error fetching sale by ID:", error);
    res.status(500).json({ error: "Не вдалося отримати продаж" });
  }
});

module.exports = router;
