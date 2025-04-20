const express = require("express");
const Shopping = require("../schemas/shopping");
const router = express.Router();
const Product = require("../schemas/product");
const mongoose = require("mongoose");

router.get("/", async (req, res) => {
  try {
    const cartItems = await Shopping.find().populate("productId");
    res.json({ cart: cartItems });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve shopping cart items" });
  }
});

router.post("/add", async (req, res) => {
  try {
    console.log("Request body:", req.body); // Додати лог
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const existingItem = await Shopping.findOne({ productId });
    if (existingItem) {
      existingItem.quantity += quantity || 1;
      await existingItem.save();
      return res.json({
        message: "Item quantity updated in cart",
        item: existingItem,
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const newItem = new Shopping({
      productId,
      name: product.name,
      photoUrl: product.photoUrl,
      price: product.price,
      quantity: quantity || 1,
      inStock: product.inStock,
    });

    await newItem.save();
    res.status(201).json({ message: "Item added to cart", item: newItem });
  } catch (error) {
    res.status(500).json({ error: "Failed to add item to cart" });
  }
});

router.patch("/update/:id", async (req, res) => {
  try {
    const itemId = req.params.id; // ID товару
    const { quantity } = req.body; // Нова кількість

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: "Invalid quantity" });
    }

    const item = await Shopping.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    item.quantity = quantity;
    await item.save();

    res.json({ message: "Item quantity updated", item });
  } catch (error) {
    console.error("Error updating item quantity:", error.message);
    res.status(500).json({ error: "Failed to update item quantity" });
  }
});

router.delete("/remove/:id", async (req, res) => {
  console.log("Incoming DELETE request for ID:", req.params.id);

  try {
    const itemId = mongoose.Types.ObjectId(req.params.id);
    console.log("Converted ID:", itemId); // Логування для перевірки

    const deletedItem = await ShoppingCart.findByIdAndDelete(itemId);
    console.log("Result from findByIdAndDelete:", deletedItem);

    if (!deletedItem) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    res.json({ message: `Item with ID ${itemId} removed from cart` });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete item from cart" });
  }
});

module.exports = router;
