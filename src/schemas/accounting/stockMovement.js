const mongoose = require("mongoose");
const Product = require("../product");
const OnlineSale = require("../sales/onlineSales");
const OfflineSales = require("../sales/offlineSales");
const stockMovementSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
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
  },
  unitPrice: Number, // ціна закупки або продажу
  relatedSaleId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "saleSource",
  },
  saleSource: {
    type: String,
    enum: ["OnlineSale", "OfflineSale"],
  },
  note: String,
});

const StockMovement = mongoose.model("StockMovement", stockMovementSchema);
module.exports = StockMovement;
