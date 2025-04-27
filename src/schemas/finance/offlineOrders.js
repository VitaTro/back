const mongoose = require("mongoose");

const offlineOrderSchema = new mongoose.Schema(
  {
    // Масив продуктів у замовленні
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
        color: { type: String }, // Робимо поле опціональним
      },
    ],

    // Загальна ціна замовлення
    totalPrice: { type: Number, required: true },

    // Метод оплати
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bank_transfer"], // Додаємо гнучкість
      required: true,
    },

    // Примітки до замовлення
    notes: { type: String }, // Нехай буде опціональним

    // Унікальний ідентифікатор замовлення

    // Таймстемпи створення та оновлення
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true } // Додатково додає createdAt та updatedAt автоматично
);

const OfflineOrder = mongoose.model("OfflineOrder", offlineOrderSchema);
module.exports = OfflineOrder;
