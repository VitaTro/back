const mongoose = require("mongoose");

const handmadeProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  description: {
    type: String,
    required: false,
  },

  photos: {
    type: [String],
    default: [],
  },

  length: {
    type: Number, // см
    required: false,
  },

  width: {
    type: Number, // мм
    required: false,
  },

  color: {
    type: String,
    required: false,
  },

  // 🔥 ГОЛОВНЕ: використані матеріали
  materialsUsed: [
    {
      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Material",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      unit: {
        type: String,
        enum: ["pcs", "meters", "grams"],
        required: true,
      },
    },
  ],

  // 💰 Автоматично розрахована собівартість
  totalCost: {
    type: Number,
    default: 0,
  },

  // 📅 Дата створення виробу
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // 🔗 Чи створений з цього Product
  linkedProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    default: null,
  },
});

module.exports = mongoose.model("HandmadeProduct", handmadeProductSchema);
