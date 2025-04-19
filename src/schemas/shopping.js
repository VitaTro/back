const mongoose = require("mongoose");
const Product = require("./product");

// Схема для елементів кошика
const shoppingCartSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product", // Посилання на колекцію "Product"
    required: true,
    unique: true,
  },
  name: { type: String, required: true },
  photoUrl: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
  inStock: { type: Boolean, required: true },
  color: { type: String, default: "default" },
  addedAt: { type: Date, default: Date.now },
});

const ShoppingCart = mongoose.model("ShoppingCart", shoppingCartSchema);
module.exports = ShoppingCart;
