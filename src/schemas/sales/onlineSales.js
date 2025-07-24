const mongoose = require("mongoose");
const OnlineOrder = require("../orders/onlineOrders");
const User = require("../userSchema");
const onlineSaleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // 🔹 Зв'язок з користувачем
      required: true,
    },
    onlineOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OnlineOrder",
      required: true,
    },
    products: [
      {
        _id: false,
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        index: { type: String, required: true },
        name: { type: String, required: true },
        photoUrl: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        color: { type: String }, // якщо потрібно
      },
    ],
    totalAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["elavon_link", "bank_transfer"],
      required: true,
    },
    status: {
      type: String,
      enum: ["new", "completed", "cancelled", "returned"],
      default: "new",
    },
    buyerType: {
      type: String,
      enum: ["anonim", "przedsiębiorca"],
      default: "anonim",
    },
    buyerName: String,
    buyerAddress: String,
    buyerNIP: String,
    deliveryDetails: { type: String },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    saleDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const OnlineSale = mongoose.model("OnlineSale", onlineSaleSchema);
module.exports = OnlineSale;
