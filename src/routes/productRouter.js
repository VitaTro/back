const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Product = require("../schemas/product");
// const { cloudinary, upload } = require("../config/cloudinary");
const upload = require("../config/upload");
const searchController = require("../controller/searchController");
const RecentView = require("../schemas/recent");
const StockMovement = require("../schemas/accounting/stockMovement");
// Маршрут для отримання всіх продуктів
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Отримуємо останній запис складу
    const latestStock = await StockMovement.findOne({
      productId: product._id,
    }).sort({ date: -1 });

    // Формуємо відповідь
    res.json({
      ...product.toObject(),
      availableQuantity: latestStock?.quantity ?? 0,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch product",
      error: error.message,
    });
  }
});

// Маршрут для отримання продуктів за типом
router.get("/:type", async (req, res) => {
  try {
    const type = req.params.type;
    const products = await Product.find({ category: type });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Маршрут для додавання нового продукту
router.post("/", async (req, res) => {
  try {
    const data = req.body;

    const newProduct = new Product({
      name: data.name,
      category: data.category,
      subcategory: data.subcategory,
      price: data.price,

      purchasePrice: {
        value: data.purchasePrice?.value || 0,
        currency: data.purchasePrice?.currency || "PLN",
        exchangeRateToPLN:
          data.purchasePrice?.currency !== "PLN"
            ? Number(data.purchasePrice?.exchangeRateToPLN) || null
            : null,
      },

      description: data.description,
      photoUrl: data.photoUrl,
      additionalPhotos: Array.isArray(data.additionalPhotos)
        ? data.additionalPhotos
        : [],

      size: data.size,
      width: data.width,
      length: data.length,
      color: data.color,
      quantity: data.quantity,

      index: data.index,
      clasp: data.clasp || null,
      material: data.material || null,
      materials: data.materials || null,

      hasExtension: data.hasExtension || false,
      extension: data.hasExtension ? data.extension : null,

      visible: data.visible ?? true,
      rating: data.rating || 0,
      discount: data.discount || 0,
      popularity: data.popularity || 0,

      createdAt: Date.now(),
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// Маршрут для оновлення продукту
router.patch("/:id", async (req, res) => {
  try {
    const updates = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    if (!product) {
      return res.status(404).send("Product not found");
    }
    res.json(product);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Маршрут для видалення продукту
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).send("Product not found");
    }
    res.send({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/popular", async (req, res) => {
  try {
    const popularProducts = await Product.find({})
      .sort({ popularity: -1 })
      .limit(10);

    if (popularProducts.length === 0) {
      return res.status(404).json({ message: "No popular products found" });
    }

    res.json({ products: popularProducts });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch popular products" });
  }
});

module.exports = router;
