const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
    required: true,
  },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  invoiceNumber: { type: String, required: true, unique: true },
  filePath: { type: String },

  // 🔹 Додаємо інформацію про покупця
  buyerType: { type: String, enum: ["company", "individual"], required: true },
  buyerName: { type: String, required: true },
  buyerAddress: { type: String, required: true },
  buyerNIP: { type: String, required: false }, // Тільки для компаній
});

// 🔹 Автоматична генерація номера фактури перед збереженням
InvoiceSchema.pre("save", async function (next) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const monthString = currentMonth.toString().padStart(2, "0");

  // 📌 Рахуємо кількість вже існуючих фактур у цьому місяці
  const invoiceCount = await mongoose.model("Invoice").countDocuments({
    issueDate: {
      $gte: new Date(`${currentYear}-${monthString}-01T00:00:00Z`),
      $lt: new Date(`${currentYear}-${monthString}-31T23:59:59Z`),
    },
  });

  this.invoiceNumber = `${invoiceCount + 1}/${monthString}/${currentYear}`;
  next();
});

module.exports = mongoose.model("Invoice", InvoiceSchema);
