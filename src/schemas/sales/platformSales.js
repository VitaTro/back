const mongoose = require("mongoose");

const platformSaleSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "PlatformOrder" },
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      index: String,
      name: String,
      quantity: Number,
      price: Number,
      photoUrl: String,
    },
  ],
  totalAmount: Number,
  paymentMethod: String,
  platformName: String,
  status: { type: String, default: "completed" },
  saleDate: { type: Date, default: Date.now },
  refundAmount: { type: Number, default: 0 },
  client: {
    firstName: String,
    lastName: String,
    phone: String,
    allegroClientId: String,
  },
  manualPrice: { type: Boolean, default: false }, // дефолтно false
});
const PlatformSale = mongoose.model("PlatformSale", platformSaleSchema);

module.exports = PlatformSale;
