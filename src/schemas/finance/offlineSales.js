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
        quantity: { type: Number, required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true }, // Загальна сума продажу
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer"],
      required: true,
    }, // Метод оплати
    status: {
      type: String,
      enum: ["completed", "pending", "cancelled"],
      default: "pending",
    },

    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    }, // Адміністратор
    notes: { type: String },
    saleDate: { type: Date, default: Date.now }, // Дата продажу
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const OfflineSale = mongoose.model("OfflineSale", offlineSaleSchema);
module.exports = OfflineSale;
