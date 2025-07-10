const mongoose = require("mongoose");

const offlineSaleArchiveSchema = new mongoose.Schema(
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
      enum: ["BLIK", "bank_transfer"],
      required: true,
    },
    buyerType: {
      type: String,
      enum: ["anonim", "przedsiębiorca"],
      default: "anonim",
    },
    buyerName: String,
    buyerAddress: String,
    buyerNIP: String,
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
  { timestamps: true, collection: "offlineSalesArchive" }
);

const OfflineSaleArchive = mongoose.model(
  "OfflineSaleArchive",
  offlineSaleArchiveSchema
);
module.exports = OfflineSaleArchive;
