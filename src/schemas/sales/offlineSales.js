const mongoose = require("mongoose");

const offlineSaleSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OfflineOrder",
      required: false, // резерв НЕ має orderId
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
        color: { type: String },
        size: { type: String },
        sku: { type: String },
      },
    ],

    totalAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },

    // 🔥 РЕЗЕРВАЦІЯ
    isReservation: { type: Boolean, default: false },
    reservationExpiresAt: { type: Date },

    // 🔥 paymentMethod НЕ required для резерву
    paymentMethod: {
      type: String,
      enum: ["BLIK", "bank_transfer", "terminal", "cash"],
      required: false,
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
      enum: ["completed", "pending", "cancelled", "returned", "reserved"],
      default: "completed",
    },

    refundAmount: { type: Number, default: 0 },
    notes: { type: String },
    saleDate: { type: Date, default: Date.now },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("OfflineSale", offlineSaleSchema);
