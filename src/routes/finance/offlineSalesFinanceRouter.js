const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const { validate } = require("../../middleware/validateMiddleware");

const Product = require("../../schemas/product");
const offlineSaleValidationSchema = require("../../validation/offlineSalesJoi");
const OfflineSale = require("../../schemas/finance/offlineSales");
const FinanceOverview = require("../../schemas/finance/financeOverview");
const FinanceSettings = require("../../schemas/finance/financeSettings");

// Отримати всі офлайн-продажі
router.get("/", async (req, res) => {
  try {
    console.log("🔍 Fetching offline sales...");

    // const { status } = req.query; // Додаємо фільтрацію за статусом
    // const filter = status ? { status } : { status: "completed" };
    const filter = req.query.status ? { status: req.query.status } : {};
    const sales = await OfflineSale.find(filter).populate(
      "products.productId",
      "name photoUrl price"
    );

    if (!sales || sales.length === 0) {
      console.warn("⚠️ No  sales found.");
      return res.status(404).json({ error: "No offline sales available" });
    }

    console.log("✅ offline sales fetched:", sales);
    res.status(200).json(sales);
  } catch (error) {
    console.error("🔥 Error fetching offline sales:", error);
    res.status(500).json({ error: "Failed to fetch offline sales" });
  }
});

router.post("/", validate(offlineSaleValidationSchema), async (req, res) => {
  try {
    const { products, totalAmount, paymentMethod, status } = req.body;

    const saleProducts = [];
    for (const product of products) {
      const dbProduct = await Product.findById(product.productId);
      if (!dbProduct || dbProduct.quantity < product.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for product: ${
            dbProduct?.name || product.productId
          }`,
        });
      }
      dbProduct.quantity -= product.quantity;
      await dbProduct.save();

      saleProducts.push({
        productId: dbProduct._id,
      });
    }

    const newSale = new OfflineSale({
      products: saleProducts,
      totalAmount,
      paymentMethod,
      status: status || (paymentMethod !== "cash" ? "completed" : "pending"),
      saleDate: new Date(),
    });

    await newSale.save();
    console.log("✅ Sale recorded successfully!");
    if (newSale.status === "completed") {
      await FinanceOverview.updateOne(
        {},
        {
          $inc: { totalRevenue: newSale.totalAmount },
          $push: { completedSales: newSale._id },
        },
        { upsert: true }
      );
      console.log("✅ FinanceOverview updated!");
    }
    res
      .status(201)
      .json({ message: "Offline sale recorded successfully", sale: newSale });
  } catch (error) {
    console.error("🔥 Error recording offline sale:", error);
    res.status(500).json({ error: "Failed to record offline sale" });
  }
});

// Оновити інформацію про офлайн-продаж
router.patch(
  "/:id",

  async (req, res) => {
    try {
      const { status } = req.body;
      if (!validSaleStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const sale = await OfflineSale.findById(req.params.id);
      if (!sale) {
        return res.status(404).json({ error: "Offline sale not found" });
      }

      if (sale.status === status) {
        return res.status(400).json({ error: "Sale already has this status" });
      }

      sale.status = status;
      await sale.save();
      const financeSettings = await FinanceSettings.findOne({}); // Витягуємо глобальні фінансові дані

      const expenses =
        financeSettings.operatingCosts + financeSettings.budgetForProcurement;
      const taxes = (financeSettings.taxRate / 100) * sale.totalAmount;
      const netProfit = sale.totalAmount - expenses - taxes; // 💰 Формула чистого прибутку

      await FinanceOverview.updateOne(
        {},
        {
          $inc: { totalRevenue: sale.totalAmount, totalProfit: netProfit },
          $push: { completedSales: sale._id },
        },
        { upsert: true }
      );
      console.log("✅ FinanceOverview updated with new sale data!");

      console.log(`✅ Sale status updated to '${status}'`);
      res
        .status(200)
        .json({ message: "Offline sale updated successfully", sale });
    } catch (error) {
      console.error("🔥 Error updating offline sale:", error);
      res.status(500).json({ error: "Failed to update offline sale" });
    }
  }
);

module.exports = router;
