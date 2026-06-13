const mongoose = require("mongoose");

const onlineOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    buyerName: { type: String, required: true },
    buyerEmail: { type: String, required: true },
    buyerPhone: { type: String, required: true },
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
        size: { type: String },
        sku: { type: String },
      },
    ],

    totalQuantity: { type: Number, required: true },
    totalPrice: { type: Number, required: true }, // сума товарів
    shippingCost: { type: Number, required: true }, // доставка
    finalPrice: { type: Number, required: true }, // totalPrice + shippingCost

    // 🟡 Доставка
    country: { type: String, required: true },

    pickupPointId: { type: String, default: null }, // тільки Польща
    deliveryType: {
      type: String,
      enum: ["pickup", "courier"],
      default: "pickup",
    },

    parcelSize: {
      type: String,
      enum: ["small", "medium", "large"],
      default: null, // поки що optional
    },

    deliveryPrice: {
      type: Number,
      default: 0, // поки що optional
    },

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
        "received",
        "assembled",
        "shipped",
        "completed",
        "cancelled",
        "returned",
        "paid",
      ],
      default: "new",
    },

    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            "new",
            "received",
            "assembled",
            "shipped",
            "completed",
            "cancelled",
            "returned",
            "paid",
          ],
          required: true,
        },
        updatedBy: {
          type: String,
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
