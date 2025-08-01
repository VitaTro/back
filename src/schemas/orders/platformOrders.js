const mongoose = require("mongoose");

const platformOrderSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["allegro", "etsy", "ebay", "amazon"],
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

    paymentMethod: {
      type: String,
      enum: ["platform_auto", "bank_transfer", "other"],
      default: "platform_auto",
    },
    platformFee: { type: Number, default: 0 }, // комісія Allegro, Etsy тощо

    notes: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const PlatformOrder = mongoose.model("PlatformOrder", platformOrderSchema);
module.exports = PlatformOrder;
