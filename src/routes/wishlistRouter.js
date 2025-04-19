const express = require("express");
const Wishlist = require("../schemas/wishlist");
const router = express.Router();
const Product = require("../schemas/product");

router.get("/", async (req, res) => {
  try {
    const wishlist = await Wishlist.find().populate("productId");
    res.json({ wishlist });
  } catch (error) {
    console.error("Error fetching wishlist:", error.message);
    res.status(500).json({ error: "Failed to retrieve wishlist items" });
  }
});

router.post("/add", async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId) {
      return res
        .status(400)
        .json({ error: "Product ID (productId) is required" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Перевірка, чи продукт вже є у списку бажань
    const exists = await Wishlist.findOne({ productId });
    if (exists) {
      return res.status(400).json({ error: "Product is already in wishlist" });
    }

    const newItem = new Wishlist({
      productId,
      name: product.name,
      photoUrl: product.photoUrl,
      color: product.color || "default",
      price: product.price,
      quantity: quantity || 1,
      inStock: product.inStock,
    });

    await newItem.save();
    res.status(201).json({ message: "Item added to wishlist", item: newItem });
  } catch (error) {
    res.status(500).json({ error: "Failed to add item to wishlist" });
  }
});

router.delete("/remove/:id", async (req, res) => {
  try {
    const itemId = req.params.id;

    console.log("Deleting item with ID:", itemId);

    const item = await Wishlist.findByIdAndDelete(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: `Item with ID ${itemId} removed from wishlist` });
  } catch (error) {
    console.error("Error removing from wishlist:", error.message);
    res.status(500).json({ error: "Failed to remove item from wishlist" });
  }
});

module.exports = router;
