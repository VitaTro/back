const mongoose = require("mongoose");

const offlineReservationSchema = new mongoose.Schema(
  {
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
      },
    ],

    totalAmount: { type: Number, required: true },
    finalPrice: { type: Number, required: true },

    status: {
      type: String,
      enum: ["reserved", "completed", "cancelled"],
      default: "reserved",
    },

    isReservation: { type: Boolean, default: true },

    reservationExpiresAt: { type: Date, required: true },

    notes: { type: String },

    saleDate: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("OfflineReservation", offlineReservationSchema);
