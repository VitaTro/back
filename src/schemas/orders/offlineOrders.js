const mongoose = require("mongoose");

const offlineOrderSchema = new mongoose.Schema(
  {
    // Масив продуктів у замовленні
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
        color: { type: String }, // Робимо поле опціональним
      },
    ],

    // Загальна ціна замовлення
    totalPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },

    // Метод оплати
    paymentMethod: {
      type: String,
      enum: ["BLIK", "bank_transfer", "terminal", "cash"],

      required: true,
    },

    buyerType: {
      type: String,
      enum: ["anonim", "przedsiębiorca"],
      default: "anonim",
    },
    buyerName: { type: String }, // Обовʼязкові лише при buyerType === 'przedsiębiorca'
    buyerAddress: { type: String },
    buyerNIP: { type: String },

    // Примітки до замовлення
    notes: { type: String }, // Нехай буде опціональним
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },

    // Таймстемпи створення та оновлення
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true } // Додатково додає createdAt та updatedAt автоматично
);

const OfflineOrder = mongoose.model("OfflineOrder", offlineOrderSchema);
module.exports = OfflineOrder;
