const express = require("express");
const router = express.Router();
const Product = require("../schemas/product");
const { cloudinary, upload } = require("../config/cloudinary");
const searchController = require("../controller/searchController");

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
      photoUrl,
      size,
      inStock,
      visible,
      createdAt,
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

// Search for products
router.get("/search", async (req, res) => {
  console.log("Route /search was hit");

  try {
    const allProducts = await Product.find({});
    console.log("All products:", allProducts);

    res.status(200).json(allProducts);
  } catch (error) {
    console.error("Error in /search route:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch products",
    });
  }
});

// Apply filters to products
router.post("/filters", async (req, res) => {
  try {
    const { priceRange, categories, materials } = req.body;
    const query = {};

    if (priceRange && priceRange.min && priceRange.max) {
      query.price = { $gte: priceRange.min, $lte: priceRange.max };
    }

    if (categories && categories.length > 0) {
      query.category = { $in: categories };
    }

    if (materials && materials.length > 0) {
      query.material = { $in: materials };
    }

    const filteredProducts = await Product.find(query);
    res.json({ products: filteredProducts });
  } catch (error) {
    res.status(500).json({ error: "Failed to filter products" });
  }
});

module.exports = router;
