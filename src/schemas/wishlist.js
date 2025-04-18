const mongoose = require("mongoose");
const Product = require("./product");
const User = require("./user");
const WishlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  }, // Назва товару
  photoUrl: {
    type: String,
    required: true,
  }, // Зображення товару
  color: {
    type: String,
  }, // Колір (якщо є)
  quantity: {
    type: Number,
    required: true,
    default: 1,
  }, // Кількість товару в списку
  price: {
    type: Number,
    required: true,
  }, // Ціна товару
  inStock: {
    type: Boolean,
    default: true,
  }, // Наявність товару
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});
const Wishlist = mongoose.model("Wishlist", WishlistSchema);
module.exports = Wishlist;
