const express = require("express");
const router = express.Router();

const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

const PlatformOrder = require("../../schemas/orders/platformOrders");
const PlatformSale = require("../../schemas/sales/platformSales");

const Product = require("../../schemas/product");
const StockMovement = require("../../schemas/accounting/stockMovement");
const FinanceOverview = require("../../schemas/finance/financeOverview");

const { calculateStock } = require("../../services/calculateStock");

// 🔥 CREATE PLATFORM SALE (based on PlatformOrder)
router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const { orderId, saleDate } = req.body;

    const order = await PlatformOrder.findById(orderId);
    if (!order)
      return res.status(404).json({ error: "❌ Замовлення не знайдено" });

    // 🛑 Перевірка: чи вже є продаж
    const existingSale = await PlatformSale.findOne({ orderId });
    if (existingSale)
      return res
        .status(400)
        .json({ error: "Продаж вже створено для цього замовлення" });

    if (order.status !== "pending")
      return res
        .status(400)
        .json({ error: "Замовлення вже виконано або скасовано" });

    // 🔥 Ми НЕ рахуємо ціну заново — беремо з order
    const enrichedProducts = [];
    let totalCost = 0;

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
          `❌ Немає даних зі складу для товару ${item.productId}`,
        );
      }

      const stockLevel = await calculateStock(lastMovement.productIndex);
      if (stockLevel < item.quantity) {
        return res.status(400).json({
          error: `Недостатньо ${lastMovement.productName} на складі`,
        });
      }

      const productDoc = await Product.findById(item.productId);

      const unitPurchasePrice = lastMovement.unitPurchasePrice || 0;
      const unitSalePrice = item.promoPrice ?? item.price;

      const margin = unitSalePrice - unitPurchasePrice;

      totalCost += unitPurchasePrice * item.quantity;

      enrichedProducts.push({
        productId: item.productId,
        index: lastMovement.productIndex,
        name: lastMovement.productName,
        quantity: item.quantity,
        unitPurchasePrice,
        price: unitSalePrice,
        promoPrice: item.promoPrice ?? null,
        margin,
        manualPrice: item.manualPrice,
        photoUrl: productDoc?.photoUrl || "",
        size: item.size || null,
        sku: item.sku || null,
      });
    }

    // 🔥 Фінальна сума та знижка — БЕРЕМО З ORDER
    const totalAmount = order.totalPrice;
    const finalPrice = order.finalPrice;
    const discount = order.discount;
    const discountPercent = order.discountPercent;

    const netProfit = finalPrice - totalCost;

    const sale = await PlatformSale.create({
      orderId,
      products: enrichedProducts,
      totalAmount,
      finalPrice,
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

    // 🔥 Списання складу
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

    // 🔥 Оновлення фінансів
    await FinanceOverview.updateOne(
      {},
      {
        $inc: { totalRevenue: finalPrice },
        $push: { completedSales: sale._id },
      },
      { upsert: true },
    );

    // 🔥 Оновлюємо статус замовлення
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

// 🔹 GET: всі продажі
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const sales = await PlatformSale.find(filter).sort({ saleDate: -1 });
    res.status(200).json({ sales });
  } catch (error) {
    res.status(500).json({ error: "Не вдалося отримати дані продажів" });
  }
});

// 🔹 GET: продаж за ID
router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const sale = await PlatformSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: "❌ Продаж не знайдено" });
    res.status(200).json({ sale });
  } catch (error) {
    res.status(500).json({ error: "Не вдалося отримати продаж" });
  }
});

// 🔹 PATCH: оновити статус
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
    res.status(500).json({ error: "Не вдалося оновити статус продажу" });
  }
});

// 🔹 PUT: повернення товару
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
        productId: item.productId,
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

      const productDoc = await Product.findById(item.productId);
      if (productDoc) {
        const updatedStock = await calculateStock(item.index);
        productDoc.quantity = updatedStock;
        productDoc.currentStock = updatedStock;
        productDoc.inStock = updatedStock > 0;
        await productDoc.save();
      }
    }

    await FinanceOverview.updateOne(
      {},
      { $inc: { totalRevenue: -refundAmount } },
    );

    sale.status = "returned";
    sale.refundAmount = refundAmount;
    await sale.save();

    res.status(200).json({ message: "Повернення завершено", sale });
  } catch (error) {
    res.status(500).json({ error: "Не вдалося обробити повернення" });
  }
});

module.exports = router;
