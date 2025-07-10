const StockMovement = require("../schemas/accounting/stockMovement");
const Product = require("../schemas/product");

async function handleSaleStockByIndex(saleDoc, source) {
  try {
    for (const item of saleDoc.products) {
      const product = await Product.findOne({
        index: item.index,
        name: item.name,
      });
      if (!product) {
        console.warn(`🔍 Товар не знайдено: ${item.name} (${item.index})`);
        continue;
      }

      // 🔍 Перевірка доступної кількості (через stock movements)
      const currentStock = await calculateStock(product.index);
      if (currentStock < item.quantity) {
        console.warn(`⚠️ Недостатньо на складі для ${product.name}`);
        continue;
      }

      // 📦 Створення руху
      await StockMovement.create({
        productName: product.name,
        productIndex: product.index,
        type: "sale",
        quantity: item.quantity,
        unitSalePrice: item.price,
        date: saleDoc.saleDate,
        relatedSaleId: saleDoc._id,
        saleSource: source,
        note: "Автоматичне списання при продажу",
      });

      // ❌ Не чіпаємо product.quantity — вона обчислюється потім!
    }
  } catch (err) {
    console.error("🔥 Помилка при списанні зі складу:", err);
  }
}
module.exports = { handleSaleStockByIndex };
