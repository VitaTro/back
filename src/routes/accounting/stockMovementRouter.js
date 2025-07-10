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
    if (["purchase", "restock", "return"].includes(type)) {
      product.quantity += quantity;
    }

    if (["sale", "writeOff"].includes(type)) {
      product.quantity -= quantity;
    }

    product.inStock = product.quantity > 0;
    product.currentStock = product.quantity; // якщо таке поле додаєш у схему

    if (price) {
      product.lastRetailPrice = price; // якщо таке поле є
    }

    await product.save();

    res.status(201).json({ message: "Stock movement recorded", movement });
  } catch (error) {
    console.error("🔥 Error adding stock movement:", error);
    res.status(500).json({ error: "Failed to record movement" });
  }
});
router.post("/bulk", authenticateAdmin, async (req, res) => {
  try {
    const movementsArray = req.body;

    if (!Array.isArray(movementsArray) || movementsArray.length === 0) {
      return res.status(400).json({ error: "Дані мають бути масивом рухів" });
    }

    const results = [];

    for (const movementData of movementsArray) {
      const {
        productIndex,
        productName,
        type,
        quantity,
        price,
        unitPurchasePrice,
        unitSalePrice,
        date,
        note,
      } = movementData;

      const product = await Product.findOne({
        index: productIndex,
        name: productName,
      });
      if (!product) {
        results.push({ error: "Товар не знайдено", productIndex });
        continue;
      }

      const movement = new StockMovement({
        productIndex,
        productName,
        type,
        quantity,
        price,
        unitPurchasePrice,
        unitSalePrice,
        date: date || new Date(),
        note,
      });

      await movement.save();

      if (["purchase", "restock", "return"].includes(type)) {
        product.quantity += quantity;
      } else if (["sale", "writeOff"].includes(type)) {
        product.quantity -= quantity;
      }

      product.currentStock = product.quantity;
      product.inStock = product.quantity > 0;

      if (price !== undefined) product.lastRetailPrice = price;

      await product.save();

      results.push({ success: true, movementId: movement._id });
    }

    res.json({ message: "Масовий прихід виконано", results });
  } catch (error) {
    console.error("🔥 Bulk error:", error);
    res.status(500).json({ error: "Не вдалося додати рухи" });
  }
});

router.get("/product/:productIndex", async (req, res) => {
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
router.put("/:id", authenticateAdmin, async (req, res) => {
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
router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const movement = await StockMovement.findById(req.params.id);
    if (!movement) {
      return res.status(404).json({ error: "Рух не знайдено" });
    }

    await StockMovement.findByIdAndDelete(req.params.id);
    res.json({ message: "Рух успішно видалено", deletedId: req.params.id });
  } catch (err) {
    console.error("❌ Помилка видалення руху:", err);
    res.status(500).json({ error: "Не вдалося видалити рух" });
  }
});
router.get("/", async (req, res) => {
  try {
    const movements = await StockMovement.find().sort({ date: -1 });
    res.json(movements);
  } catch (error) {
    console.error("❌ Error fetching all movements:", error);
    res.status(500).json({ error: "Не вдалося отримати всі рухи" });
  }
});

module.exports = router;
