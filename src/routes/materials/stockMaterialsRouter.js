const express = require("express");
const router = express.Router();
const StockMaterials = require("../../schemas/materials/stockMaterials");
const Material = require("../../schemas/materials/materials");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

// ======================================================
// ➤ ДОДАТИ РУХ МАТЕРІАЛУ
// ======================================================
router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const {
      materialId,
      materialName,
      type,
      quantity,
      unitPurchasePrice,
      note,
      date,
      color,
      size,
      unit,
    } = req.body;

    if (!materialId || !materialName || !type || !quantity) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Перевірка залишку
    if (["use", "writeOff"].includes(type) && material.quantity < quantity) {
      return res.status(400).json({ error: "Not enough material in stock" });
    }

    // Створюємо рух
    const movement = new StockMaterials({
      materialId,
      materialName,
      type,
      quantity,
      unitPurchasePrice: ["purchase", "restock"].includes(type)
        ? unitPurchasePrice
        : undefined,
      date: date || new Date(),
      note,
      color: color || material.color,
      size: size || material.size,
      unit: unit || material.unit,
    });

    await movement.save();

    // Оновлюємо склад
    if (["purchase", "restock", "return"].includes(type)) {
      material.quantity += quantity;
    }

    if (["use", "writeOff"].includes(type)) {
      material.quantity -= quantity;
    }

    await material.save();

    res.status(201).json({ message: "Material movement recorded", movement });
  } catch (error) {
    console.error("🔥 Error adding material movement:", error);
    res.status(500).json({ error: "Failed to record material movement" });
  }
});

// ======================================================
// ➤ МАСОВІ РУХИ
// ======================================================
router.post("/bulk", authenticateAdmin, async (req, res) => {
  try {
    const movementsArray = req.body;

    if (!Array.isArray(movementsArray) || movementsArray.length === 0) {
      return res.status(400).json({ error: "Data must be an array" });
    }

    const results = [];

    for (const movementData of movementsArray) {
      const {
        materialId,
        materialName,
        type,
        quantity,
        unitPurchasePrice,
        date,
        note,
        color,
        size,
        unit,
      } = movementData;

      const material = await Material.findById(materialId);
      if (!material) {
        results.push({ error: "Material not found", materialId });
        continue;
      }

      if (["use", "writeOff"].includes(type) && material.quantity < quantity) {
        results.push({ error: "Not enough stock", materialId });
        continue;
      }

      const movement = new StockMaterials({
        materialId,
        materialName,
        type,
        quantity,
        unitPurchasePrice,
        date: date || new Date(),
        note,
        color: color || material.color,
        size: size || material.size,
        unit: unit || material.unit,
      });

      await movement.save();

      if (["purchase", "restock", "return"].includes(type)) {
        material.quantity += quantity;
      } else if (["use", "writeOff"].includes(type)) {
        material.quantity -= quantity;
      }

      await material.save();

      results.push({ success: true, movementId: movement._id });
    }

    res.json({ message: "Bulk material movements completed", results });
  } catch (error) {
    console.error("🔥 Bulk material error:", error);
    res.status(500).json({ error: "Failed to add bulk movements" });
  }
});

// ======================================================
// ➤ ІСТОРІЯ ПО МАТЕРІАЛУ
// ======================================================
router.get("/material/:materialId", async (req, res) => {
  try {
    const { materialId } = req.params;

    const movements = await StockMaterials.find({ materialId }).sort({
      date: -1,
    });

    if (!movements.length) {
      return res.status(404).json({ error: "No movements found" });
    }

    let totalIn = 0;
    let totalOut = 0;

    movements.forEach((move) => {
      if (["purchase", "restock", "return"].includes(move.type)) {
        totalIn += move.quantity;
      } else if (["use", "writeOff"].includes(move.type)) {
        totalOut += move.quantity;
      }
    });

    const currentStock = totalIn - totalOut;

    res.json({
      materialId,
      materialName: movements[0].materialName,
      currentStock,
      totalIn,
      totalOut,
      history: movements,
    });
  } catch (error) {
    console.error("❌ Error fetching material movements:", error);
    res.status(500).json({ error: "Failed to fetch movements" });
  }
});

// ======================================================
// ➤ ОНОВИТИ РУХ
// ======================================================
router.put("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { type, quantity, date, unitPurchasePrice, note } = req.body;

    const movement = await StockMaterials.findById(req.params.id);
    if (!movement) {
      return res.status(404).json({ error: "Movement not found" });
    }

    if (type) movement.type = type;
    if (quantity) movement.quantity = quantity;
    if (date) movement.date = date;
    if (unitPurchasePrice !== undefined)
      movement.unitPurchasePrice = unitPurchasePrice;
    if (note) movement.note = note;

    await movement.save();
    res.json({ message: "Movement updated", movement });
  } catch (err) {
    console.error("🔧 Error updating movement:", err);
    res.status(500).json({ error: "Failed to update movement" });
  }
});

// ======================================================
// ➤ ВИДАЛИТИ РУХ
// ======================================================
router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const movement = await StockMaterials.findById(req.params.id);
    if (!movement) {
      return res.status(404).json({ error: "Movement not found" });
    }

    await StockMaterials.findByIdAndDelete(req.params.id);
    res.json({ message: "Movement deleted", deletedId: req.params.id });
  } catch (err) {
    console.error("❌ Error deleting movement:", err);
    res.status(500).json({ error: "Failed to delete movement" });
  }
});

// ======================================================
// ➤ ВСІ РУХИ
// ======================================================
router.get("/", async (req, res) => {
  try {
    const movements = await StockMaterials.find().sort({ date: -1 });
    res.json(movements);
  } catch (error) {
    console.error("❌ Error fetching all movements:", error);
    res.status(500).json({ error: "Failed to fetch movements" });
  }
});

module.exports = router;
