const express = require("express");
const Wishlist = require("../schemas/wishlist");
const router = express.Router();
const Product = require("../schemas/product");

router.get("/", async (req, res) => {
  try {
    const wishlist = await Wishlist.find().populate("_id"); // Заповнюємо інформацію про продукт через `_id`
    res.json({ wishlist });
  } catch (error) {
    console.error("Error fetching wishlist:", error.message);
    res.status(500).json({ error: "Failed to retrieve wishlist items" });
  }
});

router.post("/add", async (req, res) => {
  try {
    const { _id } = req.body; // Отримуємо `_id` продукту з запиту

    console.log("Request body:", req.body);

    const product = await Product.findById(_id);
    if (!product) {
      console.error("Product not found:", _id);
      return res.status(404).json({ error: "Product not found" });
    }

    const exists = await Wishlist.findOne({ _id });
    if (exists) {
      console.log("Product already in wishlist:", _id);
      return res.status(400).json({ error: "Product is already in wishlist" });
    }

    const newItem = new Wishlist({
      _id, // Використовуємо `_id` продукту
      addedAt: new Date(),
    });

    await newItem.save();
    console.log("New wishlist item added:", newItem);
    res.json({ message: "Item added to wishlist", item: newItem });
  } catch (error) {
    console.error("Error adding item to wishlist:", error.message);
    res.status(500).json({ error: "Failed to add item to wishlist" });
  }
});

router.delete("/remove/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Deleting item with ID:", id);

    const item = await Wishlist.findOneAndDelete({ _id: id });
    if (!item) {
      console.error("Item not found for deletion:", id);
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: `Item with ID ${id} removed from wishlist` });
  } catch (error) {
    console.error("Error removing from wishlist:", error.message);
    res.status(500).json({ error: "Failed to remove item from wishlist" });
  }
});

module.exports = router;
