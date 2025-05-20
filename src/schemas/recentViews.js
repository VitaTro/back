const mongoose = require("mongoose");
const Product = require("./product");
const User = require("./userSchema");

const recentViewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  viewedAt: { type: Date, default: Date.now },
});

const RecentView = mongoose.model("RecentView", recentViewSchema);

module.exports = RecentView;
