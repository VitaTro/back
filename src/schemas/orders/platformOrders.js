const mongoose = require("mongoose");

const platformOrderSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["allegro", "facebook", "instagram"],
      required: true,
    },
    externalOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

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
        photoUrl: { type: String },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true }, // Ручне введення ціни продажу
        color: { type: String },
      },
    ],

    totalPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },

    paymentMethod: {
      type: String,
      enum: [
        "payu",
        "blik",
        "bank_transfer",
        "credit_card",
        "installment",
        "allegro_balance",
        "terminal",
        "other",
      ],
      default: "payu",
    },
    platformFee: { type: Number, default: 0 }, // комісія Allegro, Etsy тощо

    notes: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    client: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      phone: { type: String },
      allegroClientId: { type: String },
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const PlatformOrder = mongoose.model("PlatformOrder", platformOrderSchema);
module.exports = PlatformOrder;
