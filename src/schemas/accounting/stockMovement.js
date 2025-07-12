const mongoose = require("mongoose");
const Product = require("../product");
const OnlineSale = require("../sales/onlineSales");
const OfflineSales = require("../sales/offlineSales");

const stockMovementSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },

  productName: {
    type: String,
    required: true,
    index: true,
  },
  productIndex: {
    type: String,
    required: true,
    index: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    enum: ["purchase", "sale", "return", "writeOff", "restock"],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [0, "Кількість не може бути менше нуля"],
  },
  unitPurchasePrice: {
    type: Number,
    required: function () {
      return ["purchase", "restock"].includes(this.type);
    },
  },
  unitSalePrice: {
    type: Number,
    required: function () {
      return this.type === "sale";
    },
  },
  price: {
    type: Number, // Рекомендована ціна продажу
    required: true,
  },
  relatedSaleId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "saleSource",
  },
  saleSource: {
    type: String,
    enum: ["OnlineSale", "OfflineSale"],
  },
  note: {
    type: String,
    default: "",
  },
});

stockMovementSchema.index({ productName: "text", productIndex: "text" });
const StockMovement = mongoose.model("StockMovement", stockMovementSchema);
module.exports = StockMovement;
