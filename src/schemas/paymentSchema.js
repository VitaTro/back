const mongoose = require("mongoose");
const User = require("../schemas/userSchema");

const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["blik", "transfer"], required: true },
  status: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending",
  },
  transactionId: { type: String },
  createdAt: { type: Date, default: Date.now },
  cardDetails: {
    cardNumber: { type: String, length: 16, match: /^\d+$/, required: false },
    expiryDate: {
      type: String,
      match: /^(0[1-9]|1[0-2])\/\d{2}$/,
      required: false,
    },
    cvv: { type: String, length: 3, match: /^\d+$/, required: false },
    cardHolder: { type: String, required: false },
  },
});

module.exports = mongoose.model("Payment", PaymentSchema);
