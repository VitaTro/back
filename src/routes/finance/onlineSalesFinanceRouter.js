const express = require("express");
const router = express.Router();
const OnlineSale = require("../../schemas/finance/onlineSales");
const Product = require("../../schemas/product");
const { validate } = require("../../middleware/validateMiddleware");
const validateOnlineSale = require("../../validation/onlineSalesJoi");

// Отримати всі онлайн продажі
router.get("/", async (req, res) => {
  try {
    const sales = await OnlineSale.find()
      .populate({
        path: "products.productId",
        select: "name photoUrl",
      })
      .populate("processedBy");
    res.status(200).json(sales);
  } catch (error) {
    console.error("Error in fetching online sales:", error);
    res.status(500).json({ error: "Failed to fetch online sales" });
  }
});

// Додати новий запис про онлайн продаж
router.post("/", validate(validateOnlineSale), async (req, res) => {
  try {
    const { products, totalAmount, paymentMethod, processedBy } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ error: "Products list cannot be empty." });
    }

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
        quantity: product.quantity,
        salePrice: product.salePrice,
      });
    }

    const newSale = new OnlineSale({
      products: saleProducts,
      totalAmount,
      paymentMethod,
      processedBy,
    });

    await newSale.save();
    res
      .status(201)
      .json({ message: "Online sale recorded successfully", sale: newSale });
  } catch (error) {
    console.error("Error in recording online sale:", error);
    res.status(500).json({ error: "Failed to record online sale" });
  }
});

// Оновити інформацію про онлайн продаж
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const sale = await OnlineSale.findByIdAndUpdate(id, updatedData, {
      new: true,
    });
    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    res.status(200).json({ message: "Online sale updated successfully", sale });
  } catch (error) {
    console.error("Error in updating online sale:", error);
    res.status(500).json({ error: "Failed to update online sale" });
  }
});
module.exports = router;
