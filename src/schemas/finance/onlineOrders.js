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
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    totalQuantity: { type: Number, required: true, default: 0 },
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
    totalPrice: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid"],
      default: "unpaid",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["BLIK", "bank_transfer"],
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
