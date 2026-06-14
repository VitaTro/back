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
    let { productId, quantity, size, sku } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // 1️⃣ Спочатку знайти продукт
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // 2️⃣ Тепер знайти stock
    const latestStock = await StockMovement.findOne({
      $or: [{ productId }, { productIndex: product.index }],
    }).sort({ date: -1 });

    if (
      !latestStock ||
      typeof latestStock.quantity !== "number" ||
      latestStock.quantity < 1
    ) {
      return res
        .status(400)
        .json({ error: "Item out of stock or not available" });
    }

    if (quantity > latestStock.quantity) {
      return res
        .status(400)
        .json({ error: "Requested quantity exceeds stock" });
    }

    // 3️⃣ Якщо sku не прийшов — визначити його по size
    if (!sku && size) {
      const variant = product.variants.find((v) => v.size === size);
      if (variant) sku = variant.variantIndex;
    }

    // 4️⃣ Шукаємо існуючий товар
    const existingItem = await ShoppingCart.findOne({
      userId: req.user.id,
      productId,
      sku,
    });

    if (existingItem) {
      existingItem.quantity += quantity || 1;

      if (existingItem.quantity > latestStock.quantity) {
        return res
          .status(400)
          .json({ error: "Updated quantity exceeds available stock" });
      }

      await existingItem.save();
      await Product.findByIdAndUpdate(productId, { $inc: { popularity: 2 } });

      return res.json({
        message: "Item quantity updated in cart",
        item: {
          ...existingItem.toObject(),
          availableQuantity: latestStock.quantity,
        },
      });
    }

    // 5️⃣ Створюємо новий товар
    const newItem = new ShoppingCart({
      userId: req.user.id,
      productId,
      name: latestStock.productName,
      photoUrl: product.photoUrl,
      price: latestStock.price,
      quantity: quantity || 1,
      inStock: latestStock.quantity > 0,
      color: product.color,
      size,
      sku,
    });

    await newItem.save();
    await Product.findByIdAndUpdate(productId, { $inc: { popularity: 2 } });

    res.status(201).json({
      message: "Item added to cart",
      item: {
        ...newItem.toObject(),
        availableQuantity: latestStock.quantity,
      },
    });
  } catch (error) {
    console.error("🔥 Error adding to cart:", error);
    res
      .status(500)
      .json({ error: "Failed to add item to cart", details: error.message });
  }
});

// router.post("/add", authenticateUser, async (req, res) => {
//   try {
// const { productId, quantity } = req.body;

// if (!productId) {
//   return res.status(400).json({ error: "Product ID is required" });
// }

// const latestStock = await StockMovement.findOne({ productId }).sort({
//   date: -1,
// });

// if (!latestStock || latestStock.quantity < 1) {
//   return res
//     .status(400)
//     .json({ error: "Item out of stock or not available" });
// }

// if (quantity > latestStock.quantity) {
//   return res
//     .status(400)
//     .json({ error: "Requested quantity exceeds stock" });
// }

// const existingItem = await ShoppingCart.findOne({
//   userId: req.user.id,
//   productId,
// });

// if (existingItem) {
//   existingItem.quantity += quantity || 1;

//   if (existingItem.quantity > latestStock.quantity) {
//     return res.status(400).json({
//       error: "Updated quantity exceeds available stock",
//     });
//   }

//   await existingItem.save();
// await Product.findByIdAndUpdate(productId, {
//   $inc: { popularity: 2 },
// });

// return res.json({
//   message: "Item quantity updated in cart",
//   item: {
//     ...existingItem.toObject(),
//     availableQuantity: latestStock.quantity,
//     },
//   });
// }

// const product = await Product.findById(productId);

// const newItem = new ShoppingCart({
//   userId: req.user.id,
//   productId,
//   name: latestStock.productName,
//   photoUrl: product.photoUrl,
//   price: latestStock.price,
//   quantity: quantity || 1,
//   inStock: latestStock.quantity > 0,
//   color: product.color,
// });

// await newItem.save();
// await Product.findByIdAndUpdate(productId, {
//   $inc: { popularity: 2 },
// });

//     res.status(201).json({
//       message: "Item added to cart",
//       item: {
//         ...newItem.toObject(),
//         availableQuantity: latestStock.quantity,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to add item to cart" });
//   }
// });

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

    if (!Array.isArray(localCart) || localCart.length === 0) {
      const cartItems = await ShoppingCart.find({ userId });
      const enrichedCart = await enrichCartWithStock(cartItems);
      return res.json({ cart: enrichedCart });
    }

    for (const item of localCart) {
      const rawId = item.productId || item.id;

      if (!mongoose.Types.ObjectId.isValid(rawId)) continue;

      const productId = new mongoose.Types.ObjectId(rawId);
      const product = await Product.findById(productId);
      if (!product) continue;

      // 1️⃣ шукаємо stock по productId або productIndex
      const latestStock = await StockMovement.findOne({
        $or: [{ productId }, { productIndex: product.index }],
      }).sort({ date: -1 });

      if (!latestStock || latestStock.quantity < 1) continue;

      // 2️⃣ визначаємо sku, якщо не прийшов
      let sku = item.sku || null;
      if (!sku && item.size) {
        const variant = product.variants.find((v) => v.size === item.size);
        if (variant) sku = variant.variantIndex;
      }

      // 3️⃣ шукаємо існуючий товар
      const existing = await ShoppingCart.findOne({
        userId,
        productId,
        sku,
      });

      if (existing) {
        existing.quantity = Math.min(
          existing.quantity + (item.quantity || 1),
          latestStock.quantity,
        );
        await existing.save();
      } else {
        await ShoppingCart.create({
          userId,
          productId,
          name: latestStock.productName || product.name,
          photoUrl: product.photoUrl,
          size: item.size || null,
          sku: sku || null,
          price:
            latestStock.lastRetailPrice ??
            latestStock.unitSalePrice ??
            latestStock.price ??
            0,
          quantity: Math.min(item.quantity || 1, latestStock.quantity),
          inStock: latestStock.quantity > 0,
          color: product.color,
        });
      }
    }

    const cartItems = await ShoppingCart.find({ userId });
    const enrichedCart = await enrichCartWithStock(cartItems);

    res.json({ cart: enrichedCart });
  } catch (err) {
    console.error("❌ MERGE ERROR:", err);
    res.status(500).json({
      message: "Cart merge failed",
      error: err.message,
    });
  }
});

// router.post("/merge", authenticateUser, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const localCart = req.body.localCart || [];

//     // Якщо гостьовий кошик порожній → просто повертаємо бекендовий
//     if (!Array.isArray(localCart) || localCart.length === 0) {
//       const cartItems = await ShoppingCart.find({ userId });
//       const enrichedCart = await enrichCartWithStock(cartItems);
//       return res.json({ cart: enrichedCart });
//     }

//     for (const item of localCart) {
//       const rawId = item.productId || item.id;

//       // ❗ 1. Перевірка валідності ObjectId
//       if (!mongoose.Types.ObjectId.isValid(rawId)) {
//         console.warn("❌ Invalid productId in guest cart:", rawId);
//         continue;
// }
// const productId = new mongoose.Types.ObjectId(rawId);
// // ❗ 2. Перевіряємо, чи існує продукт
// const product = await Product.findById(productId);
// if (!product) {
//   console.warn("❌ Product not found:", productId);
//   continue;
// }

// // ❗ 3. Беремо останній stock
// const latestStock = await StockMovement.findOne({ productId }).sort({
//   date: -1,
// });
// if (!latestStock || latestStock.quantity < 1) {
//   console.warn("❌ No stock for:", productId);
//   continue;
// }

// res.json({ cart: enrichedCart });
// } catch (err) {   // ❗ 4. Шукаємо товар у кошику юзера
//     const existing = await ShoppingCart.findOne({ userId, productId });

//     if (existing) {
//       // Оновлюємо кількість
//       existing.quantity = Math.min(
//         existing.quantity + (item.quantity || 1),
//         latestStock.quantity,
//       );
//       await existing.save();
//     } else {
//       // Створюємо новий товар
//       await ShoppingCart.create({
//         userId,
//         productId,
//         name: latestStock.productName || product.name,
//         photoUrl: product.photoUrl,
//         price:
//           latestStock.lastRetailPrice ??
//           latestStock.unitSalePrice ??
//           latestStock.price ??
//           0,
//         quantity: Math.min(item.quantity || 1, latestStock.quantity),
//         inStock: latestStock.quantity > 0,
//         color: product.color,
//       });
//     }
//   }

//   // Повертаємо оновлений кошик
//   const cartItems = await ShoppingCart.find({ userId });
//   const enrichedCart = await enrichCartWithStock(cartItems);

//     console.error("❌ MERGE ERROR:", err);
//     res.status(500).json({
//       message: "Cart merge failed",
//       error: err.message,
//     });
//   }
// });
// async function enrichCartWithStock(cartItems) {
//   return Promise.all(
//     cartItems.map(async (item) => {
//       const latestStock = await StockMovement.findOne({
//         productId: item.productId,
//       }).sort({ date: -1 });

//       return {
//         ...item.toObject(),
//         availableQuantity: latestStock?.quantity ?? 0,
//       };
//     }),
//   );
// }

module.exports = router;
