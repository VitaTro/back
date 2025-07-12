const mongoose = require("mongoose");
const Product = require("./src/schemas/product");
const { calculateStock } = require("./src/services/calculateStock");
require("dotenv").config();

(async () => {
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const product = await Product.findById("68543830a79bf13b70e228cf");
  if (!product) {
    console.log("Товар не знайдено");
    return;
  }

  const stockCount = await calculateStock(product.index);
  product.quantity = stockCount;
  product.currentStock = stockCount;
  product.inStock = stockCount > 0;

  await product.save();

  console.log(`✅ Синхронізовано: залишок = ${stockCount}`);
  mongoose.disconnect();
})();
