const mongoose = require("mongoose");
const adminOrderSchema = new mongoose.Schema(
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
      enum: ["cash", "card", "bank_transfer"], // Можливість додати інші методи
      required: true,
    },

    // Адреса доставки (якщо потрібно)
    deliveryAddress: { type: String },

    // Статус замовлення
    status: {
      type: String,
      enum: ["new", "completed", "cancelled"],
      default: "new",
    },

    // Примітки до замовлення
    notes: { type: String },

    // Унікальний ідентифікатор замовлення
    orderId: {
      type: String,
      unique: true,
      default: () =>
        `ADM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    },

    // Таймстемпи
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const AdminOrder = mongoose.model("AdminOrder", adminOrderSchema);
module.exports = AdminOrder;
