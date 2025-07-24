const express = require("express");
const ShoppingCart = require("../../schemas/shopping");
const router = express.Router();
const { authenticateUser } = require("../../middleware/authenticateUser");
const Product = require("../../schemas/product");
const mongoose = require("mongoose");
const Wishlist = require("../../schemas/wishlist");
const StockMovement = require("../../schemas/accounting/stockMovement");
router.get("/", authenticateUser, async (req, res) => {
  try {
    const cartItems = await ShoppingCart.find({ userId: req.user.id }).populate(
      "productId"
    );
    res.json({ cart: cartItems });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve shopping cart items" });
  }
});

router.post("/add", authenticateUser, async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const existingItem = await ShoppingCart.findOne({
      userId: req.user.id,
      productId,
    });
    if (existingItem) {
      existingItem.quantity += quantity || 1;
      await existingItem.save();
      return res.json({
        message: "Item quantity updated in cart",
        item: existingItem,
      });
    }

    const latestStock = await StockMovement.findOne({ productId }).sort({
      date: -1,
    });
    if (quantity > latestStock.quantity) {
      return res
        .status(400)
        .json({ error: "Requested quantity exceeds stock" });
    }

    if (!latestStock || latestStock.quantity < 1) {
      return res
        .status(400)
        .json({ error: "Item out of stock or not available" });
    }
    const product = await Product.findById(productId);
    const newItem = new ShoppingCart({
      userId: req.user.id,
      productId,
      name: latestStock.productName,
      photoUrl: product.photoUrl,
      price: latestStock.price,
      quantity: quantity || 1,
      inStock: latestStock.quantity > 0,
      color: product.color,
    });

    await newItem.save();
    res.status(201).json({ message: "Item added to cart", item: newItem });
  } catch (error) {
    res.status(500).json({ error: "Failed to add item to cart" });
  }
});

router.patch("/update/:id", authenticateUser, async (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: "Invalid quantity" });
    }

    // 🔍 Знаходимо тільки товар, який належить даному користувачу
    const item = await ShoppingCart.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!item) {
      return res
        .status(404)
        .json({ error: "Item not found or does not belong to user" });
    }

    item.quantity = quantity;
    await item.save();

    res.json({ message: "Item quantity updated", item });
  } catch (error) {
    console.error("Error updating item quantity:", error.message);
    res.status(500).json({ error: "Failed to update item quantity" });
  }
});

router.delete("/remove/:id", authenticateUser, async (req, res) => {
  try {
    const item = await ShoppingCart.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!item) {
      return res
        .status(404)
        .json({ error: "Item not found or does not belong to user" });
    }

    res.json({ message: `Item removed from cart` });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove item from cart" });
  }
});

router.post("/move-to-wishlist/:id", authenticateUser, async (req, res) => {
  try {
    const cartItem = await ShoppingCart.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!cartItem) {
      return res.status(404).json({ error: "Item not found in user's cart" });
    }
    const existsInWishlist = await Wishlist.findOne({
      userId: req.user.id,
      productId: cartItem.productId,
    });
    if (existsInWishlist) {
      await ShoppingCart.findByIdAndDelete(cartItem._id);
      return res.json({
        message: "Item already in wishlist, removed from cart",
      });
    }
    const latestStock = await StockMovement.findOne({
      productId: cartItem.productId,
    }).sort({ date: -1 });
    if (!latestStock) {
      return res
        .status(404)
        .json({ error: "No stock data found for this product" });
    }
    const unitPrice =
      latestStock.lastRetailPrice ??
      latestStock.unitSalePrice ??
      latestStock.price ??
      0;

    const newWishlistItem = new Wishlist({
      userId: req.user.id,
      productId: cartItem.productId,
      name: latestStock.productName,
      photoUrl: cartItem.photoUrl,
      price: unitPrice,
      inStock: latestStock.quantity > 0,
      addedAt: new Date(),
    });
    await newWishlistItem.save();

    await ShoppingCart.findByIdAndDelete(cartItem._id);

    res.json({ message: "Item moved to wishlist", item: newWishlistItem });
  } catch (error) {
    res.status(500).json({ error: "Failed to move item to wishlist" });
  }
});

module.exports = router;
