const mongoose = require("mongoose");
const User = require("./userSchema");
const Product = require("./product");

const wishlistSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId, // Використовуємо `_id` продукту
    ref: "Product",
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  photoUrl: {
    type: String,
    required: true,
  },
  color: {
    type: String,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  inStock: {
    type: Boolean,
    default: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

module.exports = Wishlist;
