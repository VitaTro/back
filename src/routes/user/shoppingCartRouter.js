const express = require("express");
const ShoppingCart = require("../../schemas/shopping");
const router = express.Router();
const { authenticateUser } = require("../../middleware/authenticateUser");
const Product = require("../../schemas/product");
const mongoose = require("mongoose");
const Wishlist = require("../../schemas/wishlist");
const StockMovement = require("../../schemas/accounting/stockMovement");
const User = require("../../schemas/userSchema");

router.get("/", authenticateUser, async (req, res) => {
  try {
    const cartItems = await ShoppingCart.find({ userId: req.user.id });

    const enrichedCart = await Promise.all(
      cartItems.map(async (item) => {
        const latestStock = await StockMovement.findOne({
          productId: item.productId,
        }).sort({ date: -1 });

        return {
          ...item.toObject(),
          availableQuantity: latestStock?.quantity ?? 0,
        };
      }),
    );

    res.json({ cart: enrichedCart });
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

    const latestStock = await StockMovement.findOne({ productId }).sort({
      date: -1,
    });

    if (!latestStock || latestStock.quantity < 1) {
      return res
        .status(400)
        .json({ error: "Item out of stock or not available" });
    }

    if (quantity > latestStock.quantity) {
      return res
        .status(400)
        .json({ error: "Requested quantity exceeds stock" });
    }

    const existingItem = await ShoppingCart.findOne({
      userId: req.user.id,
      productId,
    });

    if (existingItem) {
      existingItem.quantity += quantity || 1;

      if (existingItem.quantity > latestStock.quantity) {
        return res.status(400).json({
          error: "Updated quantity exceeds available stock",
        });
      }

      await existingItem.save();

      return res.json({
        message: "Item quantity updated in cart",
        item: {
          ...existingItem.toObject(),
          availableQuantity: latestStock.quantity,
        },
      });
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

    res.status(201).json({
      message: "Item added to cart",
      item: {
        ...newItem.toObject(),
        availableQuantity: latestStock.quantity,
      },
    });
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

    const item = await ShoppingCart.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!item) {
      return res
        .status(404)
        .json({ error: "Item not found or does not belong to user" });
    }

    const latestStock = await StockMovement.findOne({
      productId: item.productId,
    }).sort({ date: -1 });

    if (!latestStock) {
      return res.status(400).json({ error: "Stock data missing" });
    }

    if (quantity > latestStock.quantity) {
      return res.status(400).json({
        error: "Requested quantity exceeds available stock",
      });
    }

    item.quantity = quantity;
    await item.save();

    res.json({
      message: "Item quantity updated",
      item: {
        ...item.toObject(),
        availableQuantity: latestStock.quantity,
      },
    });
  } catch (error) {
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
router.post("/merge", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const localCart = req.body.localCart || [];

    const user = await User.findById(userId);

    // 1. Зливаємо кошики
    const merged = mergeCarts(user.cart, localCart);

    // 2. Додаємо доступну кількість для кожного товару
    const enrichedCart = await Promise.all(
      merged.map(async (item) => {
        const latestStock = await StockMovement.findOne({
          productId: item.productId,
        }).sort({ date: -1 });

        return {
          ...item,
          availableQuantity: latestStock?.quantity ?? 0,
        };
      }),
    );

    // 3. Зберігаємо
    user.cart = enrichedCart;
    await user.save();

    // 4. Повертаємо enriched cart
    res.json({ cart: enrichedCart });
  } catch (err) {
    res.status(500).json({
      message: "Cart merge failed",
      error: err.message,
    });
  }
});

function mergeCarts(serverCart, localCart) {
  const map = new Map();

  [...serverCart, ...localCart].forEach((item) => {
    if (map.has(item.productId)) {
      map.get(item.productId).quantity += item.quantity;
    } else {
      map.set(item.productId, { ...item });
    }
  });

  return [...map.values()];
}

module.exports = router;
