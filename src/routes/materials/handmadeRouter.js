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
    let enrichedMaterials = [];

    for (const item of materialsUsed) {
      const material = await Material.findById(item.materialId);
      if (!material) {
        return res.status(404).json({
          error: `Material not found: ${item.materialId}`,
        });
      }

      const totalMaterialQty = material.quantity || 1;
      const pricePerUnit =
        (material.purchasePrice?.value || 0) / totalMaterialQty;
      const costForThisMaterial = pricePerUnit * item.quantity;

      totalCost += costForThisMaterial;

      // ✔ Збагачений запис
      enrichedMaterials.push({
        ...item,
        name: material.name,
        purchasePrice: material.purchasePrice?.value || 0,
        materialTotalQty: material.quantity,
        pricePerUnit,
        costForThisMaterial,
      });
    }
    const handmade = new HandmadeProduct({
      name,
      description,
      photos: photos || [],
      length,
      width,
      color,
      materialsUsed: enrichedMaterials,
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

    // Назва має збігатися
    if (name !== handmade.name) {
      return res.status(400).json({
        error:
          "Product name must match handmade card name to perform material deduction",
      });
    }

    // ======================================================
    // ➤ ПЕРЕВІРКА ЗАЛИШКІВ З КОНВЕРТАЦІЄЮ
    // ======================================================
    for (const item of handmade.materialsUsed) {
      const material = await Material.findById(item.materialId);

      if (!material) {
        return res.status(404).json({
          error: `Material not found: ${item.materialId}`,
        });
      }

      let deductQty = 0;

      if (material.unit === item.usedUnit) {
        deductQty = item.quantity;
      } else if (material.unit === "grams" && item.usedUnit === "pcs") {
        if (!material.piecesPerGram) {
          return res.status(400).json({
            error: `Material ${material.name} missing piecesPerGram`,
          });
        }
        deductQty = item.quantity / material.piecesPerGram;
      } else if (material.unit === "meters" && item.usedUnit === "pcs") {
        if (!material.piecesPerMeter) {
          return res.status(400).json({
            error: `Material ${material.name} missing piecesPerMeter`,
          });
        }
        deductQty = item.quantity / material.piecesPerMeter;
      } else {
        return res.status(400).json({
          error: `Cannot convert ${item.usedUnit} to ${material.unit}`,
        });
      }

      if (material.quantity < deductQty) {
        return res.status(400).json({
          error: `Not enough material: ${material.name}`,
        });
      }
    }

    // ======================================================
    // ➤ СПИСАННЯ МАТЕРІАЛІВ
    // ======================================================
    for (const item of handmade.materialsUsed) {
      const material = await Material.findById(item.materialId);

      let deductQty = 0;

      if (material.unit === item.usedUnit) {
        deductQty = item.quantity;
      } else if (material.unit === "grams" && item.usedUnit === "pcs") {
        deductQty = item.quantity / material.piecesPerGram;
      } else if (material.unit === "meters" && item.usedUnit === "pcs") {
        deductQty = item.quantity / material.piecesPerMeter;
      }

      // Списання
      material.quantity -= deductQty;
      await material.save();

      // Запис руху
      await StockMaterials.create({
        materialId: material._id,
        materialName: material.name,
        type: "use",
        quantity: deductQty,
        usedUnit: item.usedUnit,
        unitPurchasePrice: material.purchasePrice?.value || 0,
        color: material.color,
        size: material.size,
        unit: material.unit,
        note: `Used for handmade product: ${handmade.name}`,
      });
    }

    // ======================================================
    // ➤ СТВОРЕННЯ ГОТОВОГО ПРОДУКТУ
    // ======================================================
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
