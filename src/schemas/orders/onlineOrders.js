const mongoose = require("mongoose");

const onlineOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🟡 Товари
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
        color: { type: String },
      },
    ],

    totalQuantity: { type: Number, required: true },
    totalPrice: { type: Number, required: true }, // сума товарів
    shippingCost: { type: Number, required: true }, // доставка
    finalPrice: { type: Number, required: true }, // totalPrice + shippingCost

    // 🟡 Доставка
    country: { type: String, required: true },

    pickupPointId: { type: String, default: null }, // тільки Польща

    deliveryAddress: {
      fullName: String,
      street: String,
      houseNumber: String,
      apartmentNumber: String,
      city: String,
      postalCode: String,
    },

    // 🟡 Оплата
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "unpaid",
    },

    paymentMethod: {
      type: String,
      enum: ["tpay"],
      default: "tpay",
    },

    transactionId: { type: String },
    paymentUrl: { type: String },

    // 🟡 Статуси
    status: {
      type: String,
      enum: [
        "new",
        "assembled",
        "shipped",
        "completed",
        "cancelled",
        "returned",
      ],
      default: "new",
    },

    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            "new",
            "assembled",
            "shipped",
            "completed",
            "cancelled",
            "returned",
          ],
          required: true,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    notes: { type: String },

    orderId: {
      type: String,
      unique: true,
      default: () =>
        `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("OnlineOrder", onlineOrderSchema);
