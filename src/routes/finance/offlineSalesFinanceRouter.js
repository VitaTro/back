const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { validate } = require("../../middleware/validateMiddleware");
const Product = require("../../schemas/product");
const OfflineSale = require("../../schemas/finance/offlineSales");
const FinanceOverview = require("../../schemas/finance/financeOverview");
const FinanceSettings = require("../../schemas/finance/financeSettings");
const offlineSaleValidationSchema = require("../../validation/offlineSalesJoi");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

router.get("/", authenticateAdmin, async (req, res) => {
  try {
    console.log("🔍 Fetching offline sales...");

    const filter = req.query.status ? { status: req.query.status } : {};
    const offlineSales = await OfflineSale.find(filter).populate(
      "products.productId",
      "name photoUrl price"
    );

    if (!offlineSales.length) {
      return res.status(404).json({ error: "No offline sales available" });
    }

    res.status(200).json(offlineSales);
  } catch (error) {
    console.error("🔥 Error fetching offline sales:", error);
    res.status(500).json({ error: "Failed to fetch offline sales" });
  }
});

router.post(
  "/",
  authenticateAdmin,
  validate(offlineSaleValidationSchema),
  async (req, res) => {
    try {
      console.log("➡️ Recording new offline sale...");
      const { products, totalAmount, paymentMethod, status } = req.body;

      const offlineSaleProducts = await Promise.all(
        products.map(async (product) => {
          const dbProduct = await Product.findById(product.productId);
          if (!dbProduct || dbProduct.quantity < product.quantity) {
            throw new Error(
              `Insufficient stock for ${dbProduct?.name || "product"}`
            );
          }

          dbProduct.quantity -= product.quantity;
          await dbProduct.save();

          return {
            productId: dbProduct._id,
            quantity: product.quantity,
            name: dbProduct.name,
            price: dbProduct.price,
            photoUrl: dbProduct.photoUrl,
          };
        })
      );

      const newOfflineSale = await OfflineSale.create({
        products: offlineSaleProducts,
        totalAmount,
        paymentMethod,
        status: status || (paymentMethod !== "cash" ? "completed" : "pending"),
        saleDate: new Date(),
      });

      if (newOfflineSale.status === "completed") {
        await FinanceOverview.updateOne(
          {},
          {
            $inc: { totalRevenue: newOfflineSale.totalAmount },
            $push: { completedOfflineSales: newOfflineSale._id },
          },
          { upsert: true }
        );
      }

      res.status(201).json({
        message: "Offline sale recorded successfully",
        sale: newOfflineSale,
      });
    } catch (error) {
      console.error("🔥 Error recording offline sale:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to record offline sale" });
    }
  }
);

router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    console.log(
      `🛠 Updating offline sale ID: ${req.params.id} with status: ${req.body.status}`
    );

    const { status } = req.body;
    const validSaleStatuses = ["pending", "completed", "cancelled"];

    if (!validSaleStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const offlineSale = await OfflineSale.findById(req.params.id);
    if (!offlineSale) {
      return res.status(404).json({ error: "Offline sale not found" });
    }

    offlineSale.status = status;
    await offlineSale.save();

    res.status(200).json({
      message: "Offline sale updated successfully",
      sale: offlineSale,
    });
  } catch (error) {
    console.error("🔥 Error updating offline sale:", error);
    res.status(500).json({ error: "Failed to update offline sale" });
  }
});

router.put("/:id/return", authenticateAdmin, async (req, res) => {
  try {
    const { refundAmount } = req.body;
    if (refundAmount < 0) {
      return res
        .status(400)
        .json({ error: "Refund amount cannot be negative" });
    }

    const sale = await OfflineSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    if (sale.status === "returned")
      return res.status(400).json({ error: "Sale already returned" });

    await Promise.all(
      sale.products.map(async (product) => {
        await Product.updateOne(
          { _id: product.productId },
          { $inc: { stock: product.quantity } }
        );
      })
    );

    await FinanceOverview.updateOne(
      {},
      { $inc: { totalRevenue: -refundAmount } }
    );

    sale.status = "returned";
    sale.refundAmount = refundAmount;
    await sale.save();

    res.status(200).json({ message: "Sale returned successfully", sale });
  } catch (error) {
    console.error("🔥 Error processing return:", error);
    res.status(500).json({ error: "Failed to return sale" });
  }
});

module.exports = router;
