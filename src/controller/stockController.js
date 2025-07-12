const StockMovement = require("../schemas/accounting/stockMovement");
const Product = require("../schemas/product");
const { calculateStock } = require("../services/calculateStock");

async function handleSaleStockByIndex(saleDoc, source) {
  try {
    for (const item of saleDoc.products) {
      if (!item.index || !item.name) {
        console.warn(`⚠️ Відсутній index або name у продукті:`, item);
        continue;
      }

      const product = await Product.findOne({
        index: item.index,
        name: item.name,
      });

      if (!product) {
        console.warn(`🔍 Товар не знайдено: ${item.name} (${item.index})`);
        continue;
      }

      if (product.quantity < item.quantity) {
        console.warn(`⚠️ Недостатньо залишку для ${item.name}`);
        continue;
      }

      const movement = new StockMovement({
        productIndex: item.index,
        productName: item.name,
        type: "sale",
        quantity: item.quantity,
        price: item.price, // 📌 Обовʼязкове поле згідно схеми
        unitSalePrice: item.price, // ✅ required для типу 'sale'
        date: saleDoc.saleDate || new Date(),
        relatedSaleId: saleDoc._id,
        saleSource: source,
        note: "Автоматичне списання при продажу",
      });

      await movement.save();

      // 🧮 Оновлюємо кількість у товарі
      product.quantity -= item.quantity;
      product.currentStock = product.quantity;
      product.inStock = product.quantity > 0;

      if (item.price) product.lastRetailPrice = item.price;

      await product.save();

      console.log(`✅ Рух продажу створено для ${item.name} (${item.index})`);
    }
  } catch (err) {
    console.error("🔥 Помилка при списанні зі складу:", err);
  }
}
async function autoUpdateStockAfterSale(saleDoc) {
  try {
    for (const item of saleDoc.products) {
      const product = await Product.findById(item.productId);
      if (!product || product.quantity < item.quantity) {
        console.warn(`⚠️ Недостатньо ${item.name} на складі або не знайдено`);
        continue;
      }
      const movement = new StockMovement({
        productIndex: product.index,
        productName: product.name,
        quantity: item.quantity,
        type: "sale",
        unitSalePrice: item.price,
        price: item.price,
        relatedSaleId: saleDoc._id,
        saleSource: "OfflineSale",
        note: "Автосписання при підтвердженні продажу",
        date: saleDoc.saleDate || new Date(),
      });

      await movement.save();
      product.quantity -= item.quantity;
      product.currentStock = product.quantity;
      product.inStock = product.quantity > 0;
      product.lastRetailPrice = item.price;

      await product.save();
      console.log(`✅ Списано: ${product.name}, -${item.quantity}`);
    }
  } catch (err) {
    console.error("🔥 Помилка автооновлення складу:", err);
  }
}

module.exports = { handleSaleStockByIndex, autoUpdateStockAfterSale };
