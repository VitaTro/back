const mongoose = require("mongoose");
const OfflineOrder = require("./offlineOrders");
const Product = require("../product");
const offlineSaleSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OfflineOrder",
      required: true,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        photoUrl: { type: String, required: true },
        quantity: { type: Number, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        color: { type: String },
      },
    ],
    totalAmount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "card"],
      required: true,
    },
    status: {
      type: String,
      enum: ["completed", "pending", "cancelled", "returned"],
      default: "completed",
    },
    refundAmount: { type: Number, default: 0 },
    notes: { type: String },
    saleDate: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const OfflineSale = mongoose.model("OfflineSale", offlineSaleSchema);
module.exports = OfflineSale;
