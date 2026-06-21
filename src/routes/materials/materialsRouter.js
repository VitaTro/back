const express = require("express");
const router = express.Router();
const Material = require("../../schemas/materials/materials");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

// ===============================
// GET ALL MATERIALS
// ===============================
router.get("/", async (req, res) => {
  try {
    const materials = await Material.find().sort({ name: 1 });
    res.status(200).json(materials);
  } catch (error) {
    console.error("❌ Failed to fetch materials:", error);
    res.status(500).json({ error: "Failed to fetch materials" });
  }
});

// ===============================
// GET MATERIAL BY ID
// ===============================
router.get("/:id", async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);

    if (!material) {
      return res.status(404).json({ message: "Material not found" });
    }

    res.json(material);
  } catch (error) {
    console.error("❌ Failed to fetch material:", error);
    res.status(500).json({
      message: "Failed to fetch material",
      error: error.message,
    });
  }
});

// ===============================
// CREATE MATERIAL
// ===============================
router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const data = req.body;

    if (!data.name || !data.category || !data.unit) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newMaterial = new Material({
      name: data.name,
      category: data.category,
      color: data.color || null,
      size: data.size || null,
      unit: data.unit,
      quantity: data.quantity || 0,
      purchasePrice: {
        value: data.purchasePrice?.value || 0,
        currency: data.purchasePrice?.currency || "PLN",
        exchangeRateToPLN:
          data.purchasePrice?.currency !== "PLN"
            ? Number(data.purchasePrice?.exchangeRateToPLN) || null
            : null,
      },
      photoUrl: data.photoUrl || null,
      createdAt: Date.now(),
    });

    await newMaterial.save();
    res.status(201).json(newMaterial);
  } catch (error) {
    console.error("❌ Error creating material:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
});

// ===============================
// UPDATE MATERIAL
// ===============================
router.patch("/:id", authenticateAdmin, async (req, res) => {
  try {
    const updates = req.body;

    const material = await Material.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    if (!material) {
      return res.status(404).send("Material not found");
    }

    res.json(material);
  } catch (error) {
    console.error("❌ Error updating material:", error);
    res.status(500).send(error);
  }
});

// ===============================
// DELETE MATERIAL
// ===============================
router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const material = await Material.findByIdAndDelete(req.params.id);

    if (!material) {
      return res.status(404).send("Material not found");
    }

    res.send({ message: "Material deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting material:", error);
    res.status(500).send(error);
  }
});

module.exports = router;
