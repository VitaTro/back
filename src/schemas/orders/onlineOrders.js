const mongoose = require("mongoose");

const onlineOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
        photoUrl: { type: String, required: true },
        quantity: { type: Number, required: true },

        price: { type: Number, required: true },
        color: { type: String },
      },
    ],
    totalQuantity: { type: Number, required: true, default: 0 },
    totalPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    finalPrice: { type: Number, required: true },

    buyerType: {
      type: String,
      enum: ["anonim", "przedsiębiorca"],
      default: "anonim",
    },
    buyerName: { type: String },
    buyerAddress: { type: String },
    buyerNIP: { type: String },

    status: {
      type: String,
      enum: [
        "new",
        "received",
        "assembled",
        "shipped",
        "completed",
        "cancelled",
      ],
      default: "new",
      required: true,
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

    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "unpaid",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["elavon_link", "bank_transfer"],
      required: true,
    },
    deliveryType: {
      type: String,
      enum: ["courier", "smartbox", "pickup"],
      required: true,
    },
    smartboxDetails: {
      boxId: {
        type: String,
        required: function () {
          return this.deliveryType === "smartbox";
        },
      },
      location: {
        type: String,
        required: function () {
          return this.deliveryType === "smartbox";
        },
      },
    },
    deliveryAddress: {
      postalCode: { type: String },
      city: { type: String },
      street: { type: String },
      houseNumber: { type: String },
      apartmentNumber: { type: String },
      isPrivateHouse: { type: Boolean },
    },
    payLink: {
      type: String,
    },

    notes: { type: String },
    orderId: {
      type: String,
      unique: true,
      default: () =>
        `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    },
  },
  { timestamps: true }
);

const OnlineOrder = mongoose.model("OnlineOrder", onlineOrderSchema);
module.exports = OnlineOrder;
