const mongoose = require("mongoose");

const platformSaleSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "PlatformOrder" },

  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      index: String,
      name: String,
      quantity: Number,

      // 🔥 Ціна продажу (regular або promo)
      price: Number,

      // 🔥 Акційна ціна
      promoPrice: { type: Number, default: null },

      // 🔥 Собівартість
      unitPurchasePrice: { type: Number, default: 0 },

      // 🔥 Маржа
      margin: { type: Number, default: 0 },

      // 🔥 Чи була ручна ціна
      manualPrice: { type: Boolean, default: false },

      photoUrl: String,
      size: String,
      sku: String,
    },
  ],

  // 🔥 Сума замовлення (з PlatformOrder)
  totalAmount: Number,

  // 🔥 Собівартість всіх товарів
  totalCost: { type: Number, default: 0 },

  // 🔥 Чистий прибуток
  netProfit: { type: Number, default: 0 },

  discount: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0 },

  // 🔥 Фінальна сума після знижки
  finalPrice: Number,

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
});

const PlatformSale = mongoose.model("PlatformSale", platformSaleSchema);
module.exports = PlatformSale;
