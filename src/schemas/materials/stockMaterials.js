const mongoose = require("mongoose");

const stockMaterialsSchema = new mongoose.Schema({
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Material",
    required: true,
  },

  materialName: {
    type: String,
    required: true,
  },

  date: {
    type: Date,
    default: Date.now,
  },

  type: {
    type: String,
    enum: ["purchase", "use", "return", "writeOff", "restock"],
    required: true,
  },

  quantity: {
    type: Number,
    required: true,
  },
  color: String,
  size: String,
  unit: String,

  unitPurchasePrice: {
    type: Number,
    required: function () {
      return this.type === "purchase" || this.type === "restock";
    },
  },

  note: {
    type: String,
    default: "",
  },
});

module.exports = mongoose.model("StockMaterials", stockMaterialsSchema);
