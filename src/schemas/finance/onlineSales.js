const mongoose = require("mongoose");

const onlineSaleSchema = new mongoose.Schema(
  {
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
        salePrice: { type: Number, default: 0 },
      },
    ],
    totalAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["card", "bank_transfer"],
      default: "card",
    },
    status: {
      type: String,
      enum: ["new", "completed", "cancelled", "returned"],
      default: "new",
    },
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
