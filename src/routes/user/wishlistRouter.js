const express = require("express");
const Wishlist = require("../../schemas/wishlist");
const { authenticateUser } = require("../../middleware/authenticateUser");
const router = express.Router();
const Product = require("../../schemas/product");
const ShoppingCart = require("../../schemas/shopping");

router.get("/", authenticateUser, async (req, res) => {
  try {
    const wishlist = await Wishlist.find({ userId: req.user.id }).populate(
      "productId"
    );
    res.json({ wishlist }); // ✅ Віддаємо повні дані тільки авторизованим
  } catch (error) {
    console.error("Error fetching user wishlist:", error.message);
    res.status(500).json({ error: "Failed to retrieve wishlist items" });
  }
});

router.post("/add", authenticateUser, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (!productId) {
      return res
        .status(400)
        .json({ error: "Product ID (productId) is required" });
    }
    const latestStock = await StockMovement.findOne({ productId }).sort({
      date: -1,
    });

    if (!latestStock) {
      return res
        .status(404)
        .json({ error: "No stock data found for this product" });
    }
    const exists = await Wishlist.findOne({ userId: req.user.id, productId });
    if (exists) {
      return res.status(400).json({ error: "Product is already in wishlist" });
    }

    const newItem = new Wishlist({
      userId: req.user.id,
      productId,
      name: latestStock.productName,
      price: latestStock.price,
      inStock: latestStock.quantity > 0,
      photoUrl: product.photoUrl,
      color: product.color || "default",
      quantity: quantity || 1,
    });

    await newItem.save();
    res.status(201).json({ message: "Item added to wishlist", item: newItem });
  } catch (error) {
    res.status(500).json({ error: "Failed to add item to wishlist" });
  }
});

router.delete("/remove/:id", authenticateUser, async (req, res) => {
  try {
    const itemId = req.params.id;

    console.log("Deleting item with ID:", itemId);

    const item = await Wishlist.findOneAndDelete({
      _id: itemId,
      userId: req.user.id,
    });
    if (!item) {
      return res
        .status(404)
        .json({ error: "Item not found or does not belong to user" });
    }

    res.json({ message: `Item with ID ${itemId} removed from wishlist` });
  } catch (error) {
    console.error("Error removing from wishlist:", error.message);
    res.status(500).json({ error: "Failed to remove item from wishlist" });
  }
});

router.post("/move-to-cart/:id", authenticateUser, async (req, res) => {
  try {
    const wishlistItemId = req.params.id;
    const wishlistItem = await Wishlist.findOne({
      _id: wishlistItemId,
      userId: req.user.id,
    });
    if (!wishlistItem) {
      return res
        .status(404)
        .json({ error: "Item not found in user's wishlist" });
    }

    const latestStock = await StockMovement.findOne({
      productId: wishlistItem.productId,
    }).sort({ date: -1 });

    if (!latestStock) {
      return res
        .status(404)
        .json({ error: "No stock data found for this product" });
    }
    if (latestStock.quantity < 1) {
      return res.status(400).json({ error: "Product is out of stock" });
    }

    const newCartItem = new ShoppingCart({
      userId: req.user.id,
      productId: wishlistItem.productId,
      name: latestStock.productName,
      photoUrl: wishlistItem.photoUrl,
      price: latestStock.price,
      quantity: 1,
      inStock: latestStock.quantity > 0,
      addedAt: new Date(),
    });

    const existsInCart = await ShoppingCart.findOne({
      userId: req.user.id,
      productId: wishlistItem.productId,
    });
    if (existsInCart) {
      existsInCart.quantity += 1;
      await existsInCart.save();
      await Wishlist.findByIdAndDelete(wishlistItem._id);
      return res.json({
        message: "Item quantity updated in cart",
        item: existsInCart,
      });
    }

    await newCartItem.save();

    await Wishlist.findByIdAndDelete(wishlistItemId);

    res.json({ message: "Item moved to shopping cart", item: newCartItem });
  } catch (error) {
    console.error("Failed to move item to shopping cart:", error.message);
    res.status(500).json({ error: "Failed to move item to shopping cart" });
  }
});

module.exports = router;
