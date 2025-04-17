const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    subcategory: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    photoUrl: {
      type: String,
      required: true,
    },
    size: {
      type: String, // залишаємо для старих розмірів, якщо вони текстового типу
      required: true,
    },
    width: {
      type: Number, // ширина в мм
      required: false,
    },
    length: {
      type: Number, // довжина в см
      required: false,
    },
    color: {
      type: String, // кольори, наприклад "red", "white", "green"
      required: false,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    visible: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    rating: {
      type: Number,
      default: 0,
      description: "Середній рейтинг продукту",
    },
    discount: {
      type: Number,
      default: 0,
      description: "Знижка на продукт (у відсотках)",
    },
    popularity: {
      type: Number,
      default: 0,
      description: "Популярність продукту",
    },
  },
  { collection: "products" }
);

// Індекс для пошуку по тексту
productSchema.index({ name: "text", description: "text" });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
