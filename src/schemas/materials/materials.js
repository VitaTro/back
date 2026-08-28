const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  category: {
    type: String,
    enum: ["thread", "hardware", "beads", "stones", "other"],
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
  piecesPerGram: {
    type: Number,
    required: false, // тільки для бісеру
  },

  piecesPerMeter: {
    type: Number,
    required: false, // тільки для ниток/льоски
  },
});

module.exports = mongoose.model("Material", materialSchema);
