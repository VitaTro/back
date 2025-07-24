const mongoose = require("mongoose");
const Product = require("./product");
const User = require("./userSchema");

// Схема для елементів кошика
const shoppingCartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    // unique: true,
  },
  name: { type: String, required: true },
  photoUrl: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
  inStock: { type: Boolean, required: true },
  color: { type: String },
  addedAt: { type: Date, default: Date.now },
  productIndex: { type: String },
});

const ShoppingCart = mongoose.model("ShoppingCart", shoppingCartSchema);
module.exports = ShoppingCart;
