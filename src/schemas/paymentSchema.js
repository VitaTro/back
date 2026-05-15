const mongoose = require("mongoose");

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
    enum: ["tpay"],
    default: "tpay",
  },

  status: {
    type: String,
    enum: ["pending", "paid", "failed", "cancelled", "refund_requested"],
    default: "pending",
  },

  transactionId: { type: String },
  paymentLinkUrl: { type: String },

  refundAmount: { type: Number },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", PaymentSchema);
