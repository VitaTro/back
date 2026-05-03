const mongoose = require("mongoose");
const User = require("../schemas/userSchema");
const OnlineOrder = require("../schemas/orders/onlineOrders");
const PaymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "OnlineOrder",
    required: true,
  },
  amount: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ["elavon_link", "bank_transfer"],
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "paid", "failed", "cancelled", "refund_requested"],
    default: "pending",
  },
  paymentLinkId: { type: String },
  paymentLinkUrl: { type: String },
  transactionId: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", PaymentSchema);
