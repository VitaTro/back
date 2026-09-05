const mongoose = require("mongoose");

const RepairSchema = new mongoose.Schema({
  clientName: { type: String, required: false },
  description: { type: String, required: true },

  materialsUsed: [
    {
      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Material",
        required: true,
      },
      quantity: { type: Number, required: true },
      unit: { type: String, required: true }, // meters / grams / pcs
      usedUnit: { type: String, required: true }, // meters / grams / pcs
    },
  ],

  repairPrice: { type: Number, required: true }, // скільки ти береш за ремонт
  totalCost: { type: Number, default: 0 }, // собівартість матеріалів
profit: {
  type: Number,
  default: 0,
},

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Repair", RepairSchema);
