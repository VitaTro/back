const StockMovement = require("../schemas/accounting/stockMovement");

async function calculateStock(productIndex) {
  const movements = await StockMovement.find({ productIndex });

  const totalIn = movements
    .filter((m) => ["purchase", "restock", "return"].includes(m.type))
    .reduce((sum, m) => sum + m.quantity, 0);

  const totalOut = movements
    .filter((m) => ["sale", "writeOff"].includes(m.type))
    .reduce((sum, m) => sum + m.quantity, 0);

  return totalIn - totalOut;
}

module.exports = { calculateStock };
