const express = require("express");
const router = express.Router();
const StockMovement = require("../../schemas/accounting/stockMovement");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");
const Product = require("../../schemas/product");
router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const {
      productIndex,
      productName,
      type,
      price,
      quantity,
      date,
      unitSalePrice,
      unitPurchasePrice,
      note,
      relatedSaleId,
      saleSource,
    } = req.body;

    if (!productIndex || !productName || !type || !quantity) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const product = await Product.findOne({
      index: productIndex,
      name: productName,
    });
    if (!product) {
      return res
        .status(404)
        .json({ error: "Product not found by name + index" });
    }
    const movement = new StockMovement({
      productIndex,
      productName,
      type,
      price,
      quantity,
      date: date || new Date(),
      unitPurchasePrice: ["purchase", "restock"].includes(type)
        ? unitPurchasePrice
        : undefined,
      unitSalePrice: type === "sale" ? unitSalePrice : undefined,
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

router.get("/product/:productIndex", authenticateAdmin, async (req, res) => {
  try {
    const { productIndex } = req.params;

    const movements = await StockMovement.find({ productIndex }).sort({
      date: -1,
    });
    // .populate("product")
    // .populate("relatedSaleId");

    let totalIn = 0;
    let totalOut = 0;

    movements.forEach((move) => {
      if (["purchase", "restock", "return"].includes(move.type)) {
        totalIn += move.quantity;
      } else if (["sale", "writeOff"].includes(move.type)) {
        totalOut += move.quantity;
      }
    });

    const currentStock = totalIn - totalOut;

    res.json({
      productIndex,
      currentStock,
      totalIn,
      totalOut,
      history: movements,
    });
  } catch (error) {
    console.error("❌ Error fetching product movements:", error);
    res.status(500).json({ error: "Failed to fetch movements" });
  }
});
router.put("/movement/:id", authenticateAdmin, async (req, res) => {
  try {
    const { type, quantity, date, unitPurchasePrice, unitSalePrice, note } =
      req.body;

    const movement = await StockMovement.findById(req.params.id);
    if (!movement) {
      return res.status(404).json({ error: "Рух не знайдено" });
    }

    if (type) movement.type = type;
    if (quantity) movement.quantity = quantity;
    if (date) movement.date = date;
    if (unitPurchasePrice !== undefined)
      movement.unitPurchasePrice = unitPurchasePrice;
    if (unitSalePrice !== undefined) movement.unitSalePrice = unitSalePrice;
    if (note) movement.note = note;

    await movement.save();
    res.json({ message: "Рух оновлено", movement });
  } catch (err) {
    console.error("🔧 Помилка редагування руху:", err);
    res.status(500).json({ error: "Не вдалося оновити рух" });
  }
});
router.get(
  "/index/:productIndex/summary",
  authenticateAdmin,
  async (req, res) => {
    try {
      const { productIndex } = req.params;
      const movements = await StockMovement.find({ productIndex }).sort({
        date: 1,
      });

      if (!movements.length) {
        return res
          .status(404)
          .json({ error: "Рухів по цьому SKU не знайдено" });
      }

      let totalIn = 0;
      let totalOut = 0;
      let lastPurchase = null;
      let lastSale = null;

      movements.forEach((m) => {
        if (["purchase", "restock", "return"].includes(m.type)) {
          totalIn += m.quantity;
          if (!lastPurchase || m.date > lastPurchase.date) lastPurchase = m;
        }
        if (["sale", "writeOff"].includes(m.type)) {
          totalOut += m.quantity;
          if (!lastSale || m.date > lastSale.date) lastSale = m;
        }
      });

      const currentStock = totalIn - totalOut;

      res.json({
        productIndex,
        productName: movements[0].productName,
        currentStock,
        totalIn,
        totalOut,
        lastPurchase,
        lastSale,
        history: movements,
      });
    } catch (err) {
      console.error("📉 Помилка формування звіту:", err);
      res.status(500).json({ error: "Не вдалося отримати звіт" });
    }
  }
);

module.exports = router;
