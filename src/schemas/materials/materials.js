const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  category: {
    type: String,
    enum: ["beads", "crystals", "thread", "macrame", "findings", "other"],
    required: true,
  },

  color: {
    type: String,
    required: false,
  },

  size: {
    type: String, // "2 mm", "4 mm", "8 mm"
    required: false,
  },

  unit: {
    type: String,
    enum: ["pcs", "meters", "grams"],
    required: true,
  },

  quantity: {
    type: Number,
    required: true,
    default: 0,
  },

  purchasePrice: {
    value: Number,
    currency: {
      type: String,
      enum: ["PLN", "USD", "EUR"],
      default: "PLN",
    },
    exchangeRateToPLN: Number,
  },

  photoUrl: {
    type: String,
    required: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Material", materialSchema);
