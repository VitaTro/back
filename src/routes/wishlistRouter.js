const express = require("express");
const Wishlist = require("../schemas/wishlist");
const router = express.Router();
const Product = require("../schemas/product");

router.get("/", async (req, res) => {
  try {
    const wishlist = await Wishlist.find().populate("_id");
    res.json({ wishlist });
  } catch (error) {
    console.error("Error fetching wishlist:", error.message);
    res.status(500).json({ error: "Failed to retrieve wishlist items" });
  }
});

router.post("/add", async (req, res) => {
  try {
    const { _id, quantity } = req.body;

    console.log("Request body:", req.body);

    const product = await Product.findById(_id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const exists = await Wishlist.findById(_id);
    if (exists) {
      return res.status(400).json({ error: "Product is already in wishlist" });
    }

    const newItem = new Wishlist({
      _id, // Використовуємо `_id` продукту
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
    console.error("Error adding item to wishlist:", error.message);
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
