const express = require("express");
const router = express.Router();

const Repair = require("../schemas/repair");
const Material = require("../schemas/materials/materials");
const StockMaterials = require("../schemas/materials/stockMaterials");

const { authenticateAdmin } = require("../middleware/authenticateAdmin");

router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const { clientName, description, materialsUsed, repairPrice } = req.body;

    if (
      !description ||
      !materialsUsed ||
      materialsUsed.length === 0 ||
      !repairPrice
    ) {
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

      // ✔ Правильна формула собівартості
      const totalMaterialQty = material.quantity || 1;
      const pricePerUnit =
        (material.purchasePrice?.value || 0) / totalMaterialQty;

      totalCost += pricePerUnit * item.quantity;
    }

    const repair = new Repair({
      clientName,
      description,
      materialsUsed,
      repairPrice,
      totalCost,
      createdAt: Date.now(),
    });

    await repair.save();

    res.status(201).json(repair);
  } catch (error) {
    console.error("❌ Error creating repair:", error);
    res.status(500).json({
      error: "Failed to create repair",
      details: error.message,
    });
  }
});

router.post("/:id/deduct", authenticateAdmin, async (req, res) => {
  try {
    const repair = await Repair.findById(req.params.id);

    if (!repair) {
      return res.status(404).json({ error: "Repair not found" });
    }

    for (const item of repair.materialsUsed) {
      const material = await Material.findById(item.materialId);

      if (!material) {
        return res.status(404).json({
          error: `Material not found: ${item.materialId}`,
        });
      }

      let deductQty = 0;

      // ✔ Однакові одиниці
      if (material.unit === item.usedUnit) {
        deductQty = item.quantity;
      }

      // ✔ pcs → grams
      else if (material.unit === "grams" && item.usedUnit === "pcs") {
        if (!material.piecesPerGram) {
          return res.status(400).json({
            error: `Material ${material.name} missing piecesPerGram`,
          });
        }
        deductQty = item.quantity / material.piecesPerGram;
      }

      // ✔ pcs → meters
      else if (material.unit === "meters" && item.usedUnit === "pcs") {
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

    for (const item of repair.materialsUsed) {
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
        note: `Used for repair: ${repair.description}`,
      });
    }

    res.status(200).json({
      message: "Materials deducted for repair",
      repair,
    });
  } catch (error) {
    console.error("❌ Error deducting materials:", error);
    res.status(500).json({
      error: "Failed to deduct materials",
      details: error.message,
    });
  }
});

router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const repairs = await Repair.find().sort({ createdAt: -1 });
    res.json(repairs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch repairs" });
  }
});

router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const repair = await Repair.findById(req.params.id);

    if (!repair) {
      return res.status(404).json({ error: "Repair not found" });
    }

    res.json(repair);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch repair" });
  }
});

module.exports = router;
