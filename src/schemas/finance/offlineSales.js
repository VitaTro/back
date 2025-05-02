const mongoose = require("mongoose");

const offlineSaleSchema = new mongoose.Schema(
  {
    // Основні зв'язки
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
        color: { type: String }, // Робимо поле опціональним
      },
    ],
    totalAmount: { type: Number, required: true }, // Загальна сума продажу
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "card"],
      required: true,
    }, // Метод оплати
    status: {
      type: String,
      enum: ["completed", "pending", "cancelled"],
      default: "completed",
    },

    notes: { type: String },
    saleDate: { type: Date, default: Date.now }, // Дата продажу
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const OfflineSale = mongoose.model("OfflineSale", offlineSaleSchema);
module.exports = OfflineSale;
