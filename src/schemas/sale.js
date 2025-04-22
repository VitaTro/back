const mongoose = require("mongoose");

const salesSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: { type: Number, required: true }, // Кількість проданих одиниць
  salePrice: { type: Number, required: true }, // Ціна за одиницю
  totalAmount: { type: Number, required: true }, // Загальна сума продажу
  paymentMethod: {
    type: String,
    enum: ["Credit Card", "Cash", "Online"],
    required: true,
  }, // Метод оплати
  saleDate: { type: Date, default: Date.now }, // Дата продажу
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Адміністратор
});
const Sale = mongoose.model("Sale", salesSchema);
module.exports = Sale;
