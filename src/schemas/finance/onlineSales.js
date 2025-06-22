const mongoose = require("mongoose");

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
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true },
        salePrice: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ["BLIK", "bank_transfer"],
      default: "BLIK",
      required: true,
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
