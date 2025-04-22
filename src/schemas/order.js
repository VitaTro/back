const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    enum: ["new", "completed", "cancelled"],
    default: "new",
  },
  totalPrice: { type: Number, required: true },
  paymentStatus: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },
  deliveryAddress: { type: String, required: true },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});
const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
