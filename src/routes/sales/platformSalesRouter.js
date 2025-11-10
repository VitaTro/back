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
    if (!order)
      return res.status(404).json({ error: "❌ Замовлення не знайдено" });

    // 🛑 Перевірка: чи вже є продаж для цього замовлення
    const existingSale = await PlatformSale.findOne({ orderId });
    if (existingSale)
      return res
        .status(400)
        .json({ error: "Продаж вже створено для цього замовлення" });

    if (order.status !== "pending")
      return res
        .status(400)
        .json({ error: "Замовлення вже виконано або скасовано" });

    let totalAmount = 0;
    let totalCost = 0;
    const enrichedProducts = [];

    for (const item of order.products) {
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
          `❌ Немає даних зі складу для товару ${item.productId}`
        );
      }

      const stockLevel = await calculateStock(lastMovement.productIndex);
      if (stockLevel < item.quantity) {
        return res.status(400).json({
          error: `Недостатньо ${lastMovement.productName} на складі`,
        });
      }

      const productData = await Product.findById(item.productId);

      // 💰 Ціна з замовлення, якщо manualPrice=true
      const unitPurchasePrice = lastMovement.unitPurchasePrice || 0;
      const unitPrice =
        typeof item.price === "number"
          ? item.price
          : lastMovement.unitSalePrice ?? 0;
      console.log("🧾 Ціна для продукту:", {
        productId: item.productId,
        itemPrice: item.price,
        lastMovementPrice: lastMovement.unitSalePrice,
        finalPrice: unitPrice,
      });

      const margin = unitPrice - unitPurchasePrice;
      totalAmount += unitPrice * item.quantity;
      totalCost += unitPurchasePrice * item.quantity;

      enrichedProducts.push({
        productId: item.productId,
        index: lastMovement.productIndex,
        name: lastMovement.productName,
        quantity: item.quantity,
        unitPurchasePrice,
        price: unitPrice,
        margin,
        manualPrice: order.manualPrice,
        photoUrl: productData?.photoUrl || "",
      });
    }

    const netProfit = totalAmount - totalCost;
    let discount = 0;
    let discountPercent = 0;
    let final = 0;

    if (order.discount) {
      discount = order.discount;
      discountPercent = order.discountPercent;
      final = order.finalPrice;
    } else {
      const calculated = calculateDiscount(totalAmount);
      discount = calculated.discount;
      discountPercent = calculated.discountPercent;
      final = calculated.final;
    }
    const sale = await PlatformSale.create({
      orderId,
      products: enrichedProducts,
      totalAmount,
      finalPrice: final,
      discount,
      discountPercent,
      totalCost,
      netProfit,
      paymentMethod: order.paymentMethod,
      platformName: order.platform,
      status: "completed",
      saleDate: saleDate ? new Date(saleDate) : new Date(),
      client: order.client,
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
      if (productDoc) {
        const updatedStock = await calculateStock(product.index);
        productDoc.quantity = updatedStock;
        productDoc.currentStock = updatedStock;
        productDoc.inStock = updatedStock > 0;
        await productDoc.save();
      }
    }

    await FinanceOverview.updateOne(
      {},
      {
        $inc: { totalRevenue: final },
        $push: { completedSales: sale._id },
      },
      { upsert: true }
    );

    order.status = "completed";
    await order.save();

    res.status(201).json({ message: "📦 Платформений продаж створено", sale });
  } catch (error) {
    console.error("🔥 Platform sale error:", error);
    res.status(500).json({
      error: error.message || "Помилка створення продажу на платформі",
    });
  }
});

router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const sales = await PlatformSale.find(filter).sort({ saleDate: -1 });
    res.status(200).json({ sales });
  } catch (error) {
    console.error("🔥 Error fetching platform sales:", error);
    res.status(500).json({ error: "Не вдалося отримати дані продажів" });
  }
});

router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const sale = await PlatformSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: "❌ Продаж не знайдено" });
    res.status(200).json({ sale });
  } catch (error) {
    console.error("🔥 Error fetching sale by ID:", error);
    res.status(500).json({ error: "Не вдалося отримати продаж" });
  }
});

router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "completed", "cancelled", "returned"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Невірний статус" });
    }
    const sale = await PlatformSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: "Продаж не знайдено" });
    sale.status = status;
    await sale.save();
    res.status(200).json({ message: "Статус оновлено", sale });
  } catch (error) {
    console.error("🔥 Error updating platform sale:", error);
    res.status(500).json({ error: "Не вдалося оновити статус продажу" });
  }
});
router.put("/:id/return", authenticateAdmin, async (req, res) => {
  try {
    const { refundAmount } = req.body;
    if (refundAmount < 0) {
      return res
        .status(400)
        .json({ error: "Сума повернення не може бути від’ємною" });
    }
    const sale = await PlatformSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: "Продаж не знайдено" });
    if (sale.status === "returned")
      return res.status(400).json({ error: "Продаж вже повернуто" });
    for (const item of sale.products) {
      await StockMovement.create({
        productIndex: item.index,
        productName: item.name,
        quantity: item.quantity,
        type: "return",
        unitPurchasePrice: item.unitPurchasePrice || item.price,
        price: item.price,
        relatedSaleId: sale._id,
        saleSource: "PlatformSale",
        date: new Date(),
        note: "Повернення товару після платформеного продажу",
      });
    }

    await FinanceOverview.updateOne(
      {},
      { $inc: { totalRevenue: -refundAmount } }
    );

    sale.status = "returned";
    sale.refundAmount = refundAmount;
    await sale.save();

    res.status(200).json({ message: "Повернення завершено", sale });
  } catch (error) {
    console.error("🔥 Return processing error:", error);
    res.status(500).json({ error: "Не вдалося обробити повернення" });
  }
});

module.exports = router;
