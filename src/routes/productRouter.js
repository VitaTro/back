const express = require("express");
const router = express.Router();
const Product = require("../schemas/product");
const { cloudinary, upload } = require("../config/cloudinary");

// Маршрут для отримання всіх продуктів
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
      description,
      size,
      inStock,
      visible,
      createdAt,
    } = req.body;

    const result = await cloudinary.uploader.upload(req.file.path);
    const photoUrl = result.secure_url;

    const newProduct = new Product({
      name,
      category,
      subcategory,
      price,
      description,
      photoUrl,
      size,
      inStock,
      visible,
      createdAt,
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

module.exports = router;
