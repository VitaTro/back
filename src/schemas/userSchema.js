const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const Wishlist = require("../schemas/wishlist");
const ShoppingCart = require("../schemas/shopping");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  refreshToken: { type: String },
  createdAt: { type: Date, default: Date.now },
  firstName: { type: String },
  lastName: { type: String },
  phone: { type: String },
  address: {
    postalCode: { type: String, required: false },
    city: { type: String, required: false },
    street: { type: String, required: false },
    houseNumber: { type: String, required: false },
    apartmentNumber: { type: String },
    isPrivateHouse: { type: Boolean, required: false },
  },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Wishlist" }],
  shoppingCart: [{ type: mongoose.Schema.Types.ObjectId, ref: "ShoppingCart" }],
  resetCode: { type: String },
  resetCodeExpires: { type: Date },
  passwordChangedAt: { type: Date },
});

userSchema.methods.generateVerificationToken = function () {
  this.verificationToken = crypto.randomBytes(32).toString("hex");
};

const User = mongoose.model("User", userSchema);
module.exports = User;
