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

// Search for products
// router.get("/search", async (req, res) => {
//   console.log("Route /search was hit");

//   try {
//     const query = req.query.query || req.query.q || "";
//     console.log("Received query parameter:", query);

//     if (!query) {
//       console.log("Query parameter is missing");
//       return res.status(400).json({
//         status: "error",
//         message: 'Query parameter "query" or "q" is required',
//         data: null,
//       });
//     }

//     console.log("Performing search with regex:", query);
//     const products = await Product.find({
//       $or: [
//         { name: { $regex: query, $options: "i" } },
//         { description: { $regex: query, $options: "i" } },
//         { category: { $regex: query, $options: "i" } },
//         { subcategory: { $regex: query, $options: "i" } },
//       ],
//     });
//     console.log("Search results:", products);

//     if (products.length === 0) {
//       console.log(`No products found for query: "${query}"`);
//       return res.status(404).json({
//         status: "error",
//         message: "No products found matching the query",
//         data: [],
//       });
//     }

//     console.log("Returning matched products...");
//     return res.status(200).json({
//       status: "success",
//       message: "Products fetched successfully",
//       data: products,
//     });
//   } catch (error) {
//     console.error("Error in search route:", error);
//     return res.status(500).json({
//       status: "error",
//       message: "Failed to fetch products",
//       data: null,
//     });
//   }
// });

// Apply filters to products
// router.post("/filters", async (req, res) => {
//   try {
//     const { priceRange, categories, materials } = req.body;
//     const query = {};

//     if (priceRange && priceRange.min && priceRange.max) {
//       query.price = { $gte: priceRange.min, $lte: priceRange.max };
//     }

//     if (categories && categories.length > 0) {
//       query.category = { $in: categories };
//     }

//     if (materials && materials.length > 0) {
//       query.material = { $in: materials };
//     }

//     const filteredProducts = await Product.find(query);
//     res.json({ products: filteredProducts });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to filter products" });
//   }
// });

module.exports = router;
