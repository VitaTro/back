const express = require("express");
const router = express.Router();
const Product = require("../schemas/product");
const StockMovement = require("../schemas/accounting/stockMovement");

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

    const latestStock = await StockMovement.findOne({
      productId: product._id,
    }).sort({ date: -1 });

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

router.get("/category/:type", async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.type });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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
      size: data.size || null,
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
      variants: data.variants || [],
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
