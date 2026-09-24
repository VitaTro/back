const mongoose = require("mongoose");

const onlineSaleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
        salePrice: { type: Number, required: true },
        color: { type: String },
        size: { type: String },
        sku: { type: String },
        promoPrice: { type: Number, default: null },
        unitPurchasePrice: { type: Number, default: null },
        margin: { type: Number, default: null },
      },
    ],

    totalAmount: { type: Number, required: true }, // сума товарів
    shippingCost: { type: Number, required: true }, // доставка
    finalPrice: { type: Number, required: true }, // totalAmount + shippingCost
    totalCost: { type: Number, default: null },
    netProfit: { type: Number, default: null },
    paymentMethod: {
      type: String,
      enum: ["tpay"],
      required: true,
    },

    status: {
      type: String,
      enum: ["new", "completed", "cancelled", "returned"],
      default: "new",
    },

    saleDate: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.model("OnlineSale", onlineSaleSchema);
