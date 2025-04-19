const mongoose = require("mongoose");
const Product = require("./product");
const User = require("./user");

const WishlistSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  addedAt: {
    type: Date,
    default: Date.now, // Час додавання елемента
  },
});
const Wishlist = mongoose.model("Wishlist", WishlistSchema);
module.exports = Wishlist;
