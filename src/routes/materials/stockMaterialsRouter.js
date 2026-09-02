const express = require("express");
const router = express.Router();
const StockMaterials = require("../../schemas/materials/stockMaterials");
const Material = require("../../schemas/materials/materials");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");
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
      usedUnit, // додано
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

    let deductQty = quantity; // кількість, яку реально списуємо зі складу

    if (["use", "writeOff"].includes(type)) {
      if (!usedUnit) {
        return res
          .status(400)
          .json({ error: "usedUnit is required for use/writeOff" });
      }

      // 1) Однакові одиниці
      if (material.unit === usedUnit) {
        deductQty = quantity;
      }

      // 2) Бісер: pcs → grams
      else if (material.unit === "grams" && usedUnit === "pcs") {
        if (!material.piecesPerGram) {
          return res.status(400).json({
            error: `Material ${material.name} missing piecesPerGram`,
          });
        }
        deductQty = quantity / material.piecesPerGram;
      }

      // 3) Нитка: pcs → meters
      else if (material.unit === "meters" && usedUnit === "pcs") {
        if (!material.piecesPerMeter) {
          return res.status(400).json({
            error: `Material ${material.name} missing piecesPerMeter`,
          });
        }
        deductQty = quantity / material.piecesPerMeter;
      } else {
        return res.status(400).json({
          error: `Cannot convert ${usedUnit} to ${material.unit}`,
        });
      }

      // Перевірка залишку
      if (material.quantity < deductQty) {
        return res.status(400).json({ error: "Not enough material in stock" });
      }
    }

    const movement = new StockMaterials({
      materialId,
      materialName,
      type,
      quantity: deductQty, // записуємо реальну кількість
      usedUnit: usedUnit || material.unit, // одиниця використання
      unitPurchasePrice: ["purchase", "restock"].includes(type)
        ? unitPurchasePrice
        : undefined,
      date: date || new Date(),
      note,
      color: color || material.color,
      size: size || material.size,
      unit: material.unit, // одиниця складу
    });

    await movement.save();

    if (["purchase", "restock", "return"].includes(type)) {
      material.quantity += quantity; // тут quantity = реальна одиниця складу
    }

    if (["use", "writeOff"].includes(type)) {
      material.quantity -= deductQty;
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
        usedUnit,
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

      let deductQty = quantity;

      if (["use", "writeOff"].includes(type)) {
        if (!usedUnit) {
          results.push({ error: "usedUnit required", materialId });
          continue;
        }

        if (material.unit === usedUnit) {
          deductQty = quantity;
        } else if (material.unit === "grams" && usedUnit === "pcs") {
          if (!material.piecesPerGram) {
            results.push({ error: "Missing piecesPerGram", materialId });
            continue;
          }
          deductQty = quantity / material.piecesPerGram;
        } else if (material.unit === "meters" && usedUnit === "pcs") {
          if (!material.piecesPerMeter) {
            results.push({ error: "Missing piecesPerMeter", materialId });
            continue;
          }
          deductQty = quantity / material.piecesPerMeter;
        } else {
          results.push({ error: "Cannot convert units", materialId });
          continue;
        }

        if (material.quantity < deductQty) {
          results.push({ error: "Not enough stock", materialId });
          continue;
        }
      }

      const movement = new StockMaterials({
        materialId,
        materialName,
        type,
        quantity: deductQty,
        usedUnit: usedUnit || material.unit,
        unitPurchasePrice,
        date: date || new Date(),
        note,
        color: color || material.color,
        size: size || material.size,
        unit: material.unit,
      });

      await movement.save();

      if (["purchase", "restock", "return"].includes(type)) {
        material.quantity += quantity;
      } else if (["use", "writeOff"].includes(type)) {
        material.quantity -= deductQty;
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
    const { type, quantity, usedUnit, date, unitPurchasePrice, note } =
      req.body;

    const movement = await StockMaterials.findById(req.params.id);
    if (!movement) {
      return res.status(404).json({ error: "Movement not found" });
    }

    if (type) movement.type = type;
    if (quantity) movement.quantity = quantity;
    if (usedUnit) movement.usedUnit = usedUnit;
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

module.exports = router;
