const express = require("express");
const router = express.Router();
const StockMovement = require("../../schemas/accounting/stockMovement");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const {
      product,
      date,
      type,
      quantity,
      unitPrice,
      note,
      relatedSaleId,
      saleSource,
    } = req.body;

    if (!product || !type || !quantity) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const movement = new StockMovement({
      product,
      date,
      type,
      quantity,
      unitPrice,
      note,
      relatedSaleId,
      saleSource,
    });

    await movement.save();
    res.status(201).json({ message: "Stock movement recorded", movement });
  } catch (error) {
    console.error("🔥 Error adding stock movement:", error);
    res.status(500).json({ error: "Failed to record movement" });
  }
});
module.exports = router;
