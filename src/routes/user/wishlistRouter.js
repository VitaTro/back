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
    const exists = await Wishlist.findOne({ userId: req.user.id, productId });
    if (exists) {
      return res.status(400).json({ error: "Product is already in wishlist" });
    }

    const newItem = new Wishlist({
      userId: req.user.id,
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

    // Знаходимо елемент у списку бажань
    const wishlistItem = await Wishlist.findOne({
      _id: wishlistItemId,
      userId: req.user.id,
    });
    if (!wishlistItem) {
      return res
        .status(404)
        .json({ error: "Item not found in user's wishlist" });
    }

    // Додаємо елемент до кошика
    const newCartItem = new ShoppingCart({
      userId: req.user.id,
      productId: wishlistItem.productId,
      name: wishlistItem.name,
      photoUrl: wishlistItem.photoUrl,
      price: wishlistItem.price,
      quantity: 1, // Можна встановити кількість за замовчуванням
      inStock: wishlistItem.inStock,
      addedAt: new Date(),
    });
    const existsInCart = await ShoppingCart.findOne({
      userId: req.user.id,
      productId: wishlistItem.productId,
    });
    if (existsInCart) {
      existsInCart.quantity += 1; // ✅ Оновлюємо кількість замість дублювання
      await existsInCart.save();
      await Wishlist.findByIdAndDelete(wishlistItem._id); // ✅ Видаляємо з вішліста
      return res.json({
        message: "Item quantity updated in cart",
        item: existsInCart,
      });
    }

    await newCartItem.save();

    // Видаляємо елемент зі списку бажань
    await Wishlist.findByIdAndDelete(wishlistItemId);

    res.json({ message: "Item moved to shopping cart", item: newCartItem });
  } catch (error) {
    console.error("Failed to move item to shopping cart:", error.message);
    res.status(500).json({ error: "Failed to move item to shopping cart" });
  }
});

module.exports = router;
