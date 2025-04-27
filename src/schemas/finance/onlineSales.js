const mongoose = require("mongoose");

const onlineSaleSchema = new mongoose.Schema(
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
        salePrice: { type: Number, required: true }, // Ціна продажу за одиницю
      },
    ],
    totalAmount: { type: Number, required: true }, // Загальна сума продажу
    discount: { type: Number, default: 0 }, // Знижка в процентах
    paymentMethod: {
      type: String,
      enum: ["card", "bank_transfer"],
      required: true,
    }, // Метод оплати
    status: {
      type: String,
      enum: ["confirmed", "pending", "rejected"],
      default: "pending",
    },
    deliveryDetails: { type: String }, // Додаткові деталі доставки
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // Адміністратор
    saleDate: { type: Date, default: Date.now }, // Дата продажу
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const OnlineSale = mongoose.model("OnlineSale", onlineSaleSchema);
module.exports = OnlineSale;
