const mongoose = require("mongoose");

const onlineOrderSchema = new mongoose.Schema(
  {
    // Основні зв'язки: товар і користувач
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Масив продуктів у замовленні
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, default: 1 },
      },
    ],

    // Загальна кількість товарів у замовленні
    totalQuantity: { type: Number, required: true, default: 0 },

    // Статус замовлення
    status: {
      type: String,
      enum: ["received", "assembled", "shipped", "completed", "cancelled"],
      default: "received",
    },

    // Фінансова інформація
    totalPrice: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "unpaid",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bank_transfer"],
      required: true,
    },

    // Історія змін оплати
    paymentHistory: [
      {
        status: { type: String, enum: ["paid", "unpaid"] },
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    // Інформація про доставку
    deliveryAddress: { type: String, required: true },
    deliveryTime: { type: Date }, // Запланований час доставки
    shippingMethod: {
      type: String,
      enum: ["courier", "smartbox", "pickup"],
      default: "courier",
    },

    // Додаткові нотатки
    notes: { type: String },

    // Унікальний ідентифікатор замовлення
    orderId: {
      type: String,
      unique: true,
      default: () =>
        `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    },

    // Автоматичні таймстемпи
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const OnlineOrder = mongoose.model("Order", onlineOrderSchema);
module.exports = OnlineOrder;
