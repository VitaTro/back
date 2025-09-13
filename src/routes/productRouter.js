const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Product = require("../schemas/product");
const { cloudinary, upload } = require("../config/cloudinary");
const searchController = require("../controller/searchController");
const RecentView = require("../schemas/recent");
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
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch product", error });
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
    const {
      name,
      category,
      subcategory,
      price,
      purchasePrice,
      description,
      photoUrl,
      size,
      width,
      length,
      color,
      quantity,
      materials,
      inStock,
      visible,
      index,
      createdAt,
      rating,
      discount,
      popularity,
    } = req.body;
    // console.log("Uploaded file:", req.file);
    // if (!req.file) {
    //   return res.status(400).json({ error: "No file uploaded" });
    // }
    // const result = await cloudinary.uploader.upload(req.file.path);
    // const photoUrl = result.secure_url;

    const newProduct = new Product({
      name,
      category,
      subcategory,
      price,
      purchasePrice,
      description,
      photoUrl,
      size,
      width,
      length,
      color,
      quantity,
      inStock,
      visible,
      materials,
      index,
      createdAt: createdAt || Date.now(),
      rating,
      discount,
      popularity,
    });

    await newProduct.save();
    res.status(201).send(newProduct);
  } catch (error) {
    console.error("Error:", error.message); // Додано для логування помилки
    res
      .status(500)
      .send({ error: "Internal server error", details: error.message });
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
