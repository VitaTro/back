const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
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
    type: String, // Можна також використовувати Number, залежно від типу розміру
    required: true,
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
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
