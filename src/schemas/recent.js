const mongoose = require("mongoose");
const Product = require("./product");
const User = require("./userSchema");

const recentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  viewedAt: { type: Date, default: Date.now },
});

const Recent = mongoose.model("Recent", recentSchema);

module.exports = Recent;
