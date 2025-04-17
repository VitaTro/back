const express = require("express");
const Product = require("../schemas/product");
const router = express.Router();

router.post("/api/products/filters", async (req, res) => {
  try {
    const filters = {};

    if (req.body.priceRange) {
      filters.price = {
        ...(req.body.priceRange.min && { $gte: req.body.priceRange.min }),
        ...(req.body.priceRange.max && { $lte: req.body.priceRange.max }),
      };
    }

    if (req.body.categories) {
      filters.category = { $in: req.body.categories };
    }

    if (req.body.materials) {
      filters.material = { $in: req.body.materials };
    }

    if (req.body.subcategory) {
      filters.subcategory = { $in: req.body.subcategory };
    }

    if (req.body.color) {
      filters.color = { $in: req.body.color };
    }

    if (req.body.inStock !== undefined) {
      filters.inStock = req.body.inStock;
    }

    console.log("Applied Filters:", filters); // Для дебагу

    const products = await Product.find(filters);

    res.status(200).json(products);
  } catch (error) {
    console.error("Error applying filters:", error);
    res.status(500).json({ message: "Failed to apply filters" });
  }
});
module.exports = router;
