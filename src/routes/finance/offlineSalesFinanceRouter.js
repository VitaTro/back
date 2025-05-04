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

    const filter = req.query.status ? { status: req.query.status } : {};
    const offlineSales = await OfflineSale.find(filter).populate(
      "products.productId",
      "name photoUrl price"
    );

    if (!offlineSales || offlineSales.length === 0) {
      console.warn("⚠️ No offline sales found.");
      return res.status(404).json({ error: "No offline sales available" });
    }

    console.log("✅ Offline sales fetched:", offlineSales);
    res.status(200).json(offlineSales);
  } catch (error) {
    console.error("🔥 Error fetching offline sales:", error);
    res.status(500).json({ error: "Failed to fetch offline sales" });
  }
});

router.post("/", validate(offlineSaleValidationSchema), async (req, res) => {
  try {
    console.log("➡️ Recording new offline sale...");

    const { products, totalAmount, paymentMethod, status } = req.body;
    const offlineSaleProducts = [];

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

      offlineSaleProducts.push({
        productId: dbProduct._id,
        quantity: product.quantity,
        name: product.name,
        price: product.price,
        photoUrl: product.photoUrl,
      });
    }

    const newOfflineSale = new OfflineSale({
      products: offlineSaleProducts,
      totalAmount,
      paymentMethod,
      status: status || (paymentMethod !== "cash" ? "completed" : "pending"),
      saleDate: new Date(),
    });

    await newOfflineSale.save();
    console.log("✅ Offline sale recorded successfully!");

    if (newOfflineSale.status === "completed") {
      await FinanceOverview.updateOne(
        {},
        {
          $inc: { totalRevenue: newOfflineSale.totalAmount },
          $push: { completedOfflineSales: newOfflineSale._id },
        },
        { upsert: true }
      );
      console.log("✅ FinanceOverview updated!");
    }

    res.status(201).json({
      message: "Offline sale recorded successfully",
      sale: newOfflineSale,
    });
  } catch (error) {
    console.error("🔥 Error recording offline sale:", error);
    res.status(500).json({ error: "Failed to record offline sale" });
  }
});

// Оновити інформацію про офлайн-продаж
router.patch("/:id", async (req, res) => {
  try {
    console.log(
      `🛠 Updating offline sale ID: ${req.params.id} with status: ${req.body.status}`
    );

    const { status } = req.body;
    if (!validSaleStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const offlineSale = await OfflineSale.findById(req.params.id);
    if (!offlineSale) {
      return res.status(404).json({ error: "Offline sale not found" });
    }

    if (offlineSale.status === status) {
      return res.status(400).json({ error: "Sale already has this status" });
    }

    offlineSale.status = status;
    await offlineSale.save();
    console.log(`✅ Offline sale status updated to '${status}'`);

    const financeSettings = await FinanceSettings.findOne({});
    const expenses =
      financeSettings.operatingCosts + financeSettings.budgetForProcurement;
    const taxes = (financeSettings.taxRate / 100) * offlineSale.totalAmount;
    const netProfit = offlineSale.totalAmount - expenses - taxes; // 💰 Формула чистого прибутку

    await FinanceOverview.updateOne(
      {},
      {
        $inc: { totalRevenue: offlineSale.totalAmount, totalProfit: netProfit },
        $push: { completedOfflineSales: offlineSale._id },
      },
      { upsert: true }
    );

    console.log("✅ FinanceOverview updated with new offline sale data!");
    res.status(200).json({
      message: "Offline sale updated successfully",
      sale: offlineSale,
    });
  } catch (error) {
    console.error("🔥 Error updating offline sale:", error);
    res.status(500).json({ error: "Failed to update offline sale" });
  }
});

module.exports = router;
