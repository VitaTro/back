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
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  address: {
    postalCode: { type: String, required: true },
    city: { type: String, required: true },
    street: { type: String, required: true },
    houseNumber: { type: String, required: true },
    apartmentNumber: { type: String }, // Необов’язково
    isPrivateHouse: { type: Boolean, required: true },
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
