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
        salePrice: { type: Number, default: 0 }, // ✅ Якщо не передано, буде 0
      },
    ],
    totalAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["card", "bank_transfer"],
      default: "card", // ✅ Якщо не передано, буде "card"
    },
    status: {
      type: String,
      enum: ["received", "assembled", "shipped", "completed", "cancelled"],
      default: "completed", // ✅ Уникнення "pending" конфлікту
    },
    deliveryDetails: { type: String },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // ✅ Якщо не передано, буде null
    },
    saleDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const OnlineSale = mongoose.model("OnlineSale", onlineSaleSchema);
module.exports = OnlineSale;
