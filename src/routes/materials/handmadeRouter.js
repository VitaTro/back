const express = require("express");
const router = express.Router();

const HandmadeProduct = require("../../schemas/materials/handmadeProduct");
const Material = require("../../schemas/materials/materials");
const StockMaterials = require("../../schemas/materials/stockMaterials");
const Product = require("../../schemas/product");

const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

// ======================================================
// ➤ СТВОРИТИ HANDMADE КАРТКУ (БЕЗ СПИСАННЯ)
// ======================================================
router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const { name, description, photos, length, width, color, materialsUsed } =
      req.body;

    if (!name || !materialsUsed || materialsUsed.length === 0) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Розрахунок собівартості
    let totalCost = 0;

    for (const item of materialsUsed) {
      const material = await Material.findById(item.materialId);
      if (!material) {
        return res.status(404).json({
          error: `Material not found: ${item.materialId}`,
        });
      }

      const price = material.purchasePrice?.value || 0;
      totalCost += price * item.quantity;
    }

    const handmade = new HandmadeProduct({
      name,
      description,
      photos: photos || [],
      length,
      width,
      color,
      materialsUsed,
      totalCost,
      createdAt: Date.now(),
    });

    await handmade.save();

    res.status(201).json(handmade);
  } catch (error) {
    console.error("❌ Error creating handmade:", error);
    res.status(500).json({
      error: "Failed to create handmade card",
      details: error.message,
    });
  }
});

// ======================================================
// ➤ СТВОРИТИ PRODUCT З HANDMADE (СПИСАННЯ МАТЕРІАЛІВ)
// ======================================================
router.post("/:id/create-product", authenticateAdmin, async (req, res) => {
  try {
    const handmade = await HandmadeProduct.findById(req.params.id);

    if (!handmade) {
      return res.status(404).json({ error: "Handmade card not found" });
    }

    const { name, price, index } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Перевірка назви (варіант ФА)
    if (name !== handmade.name) {
      return res.status(400).json({
        error:
          "Product name must match handmade card name to perform material deduction",
      });
    }

    // Перевірка залишків
    for (const item of handmade.materialsUsed) {
      const material = await Material.findById(item.materialId);

      if (!material) {
        return res.status(404).json({
          error: `Material not found: ${item.materialId}`,
        });
      }

      if (material.quantity < item.quantity) {
        return res.status(400).json({
          error: `Not enough material: ${material.name}`,
        });
      }
    }

    // Списання матеріалів
    for (const item of handmade.materialsUsed) {
      const material = await Material.findById(item.materialId);

      // Оновлюємо склад
      material.quantity -= item.quantity;
      await material.save();

      // Записуємо рух
      await StockMaterials.create({
        materialId: material._id,
        materialName: material.name,
        type: "use",
        quantity: item.quantity,
        unitPurchasePrice: material.purchasePrice?.value || 0,
        color: material.color,
        size: material.size,
        unit: material.unit,
        note: `Used for handmade product: ${handmade.name}`,
      });
    }

    // Створюємо Product (переносимо тільки materialsUsed + totalCost)
    const product = new Product({
      name,
      category: "handmade",
      subcategory: "handmade",
      price,
      purchasePrice: {
        value: handmade.totalCost,
        currency: "PLN",
      },
      description: req.body.description || "",
      photoUrl: req.body.photoUrl || "",
      additionalPhotos: req.body.additionalPhotos || [],
      size: req.body.size || null,
      width: req.body.width || null,
      length: req.body.length || null,
      color: req.body.color || null,
      quantity: 1,
      index: index || null,
      materials: handmade.materialsUsed,
      createdAt: Date.now(),
    });

    await product.save();

    // Прив’язуємо product до handmade
    handmade.linkedProductId = product._id;
    await handmade.save();

    res.status(201).json({
      message: "Product created and materials deducted",
      product,
    });
  } catch (error) {
    console.error("❌ Error creating product from handmade:", error);
    res.status(500).json({
      error: "Failed to create product from handmade",
      details: error.message,
    });
  }
});

// ======================================================
// ➤ ОТРИМАТИ ВСІ HANDMADE КАРТКИ
// ======================================================
router.get("/", async (req, res) => {
  try {
    const cards = await HandmadeProduct.find().sort({ createdAt: -1 });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch handmade cards" });
  }
});

// ======================================================
// ➤ ОТРИМАТИ ОДНУ HANDMADE КАРТКУ
// ======================================================
router.get("/:id", async (req, res) => {
  try {
    const card = await HandmadeProduct.findById(req.params.id);

    if (!card) {
      return res.status(404).json({ error: "Handmade card not found" });
    }

    res.json(card);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch handmade card" });
  }
});

module.exports = router;
