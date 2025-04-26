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
        color: { type: String, required: true },
      },
    ],

    // Загальна ціна замовлення
    totalPrice: { type: Number, required: true },

    // Метод оплати
    paymentMethod: { type: String, enum: ["cash", "card"], required: true },

    // Адреса доставки (опціонально)
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

    // Таймстемпи для відстеження
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const AdminOrder = mongoose.model("AdminOrder", adminOrderSchema);
module.exports = AdminOrder;
