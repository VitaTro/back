const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // опціонально
  orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  invoiceType: {
    type: String,
    enum: ["online", "offline"],
    required: true,
  },

  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  invoiceNumber: { type: String, required: true, unique: true },

  filePath: { type: String }, // локальний шлях (не обов'язковий)
  fileUrl: { type: String }, // публічне посилання на PDF

  buyerType: {
    type: String,
    enum: ["company", "individual", "anonim"],
    required: true,
  },
  buyerName: { type: String },
  buyerAddress: { type: String },
  buyerNIP: { type: String },
});

// 🧪 Автогенерація номера інвойсу
InvoiceSchema.pre("validate", async function (next) {
  // Автогенерація номера, якщо він не вказаний
  if (!this.invoiceNumber) {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();

    const count = await mongoose.model("Invoice").countDocuments({
      issueDate: {
        $gte: new Date(`${year}-${month}-01T00:00:00Z`),
        $lt: new Date(`${year}-${month}-31T23:59:59Z`),
      },
    });

    this.invoiceNumber = `INV-${count + 1}/${month}/${year}`;
  }

  // 🔐 Перевірка даних компанії
  if (this.buyerType === "company") {
    if (!this.buyerName || !this.buyerAddress || !this.buyerNIP) {
      return next(
        new Error(
          "Для компанії потрібно вказати buyerName, buyerAddress та buyerNIP"
        )
      );
    }
  }

  // 🧍‍♂️ Фізособа — необов’язкові поля, але можна додати перевірку за потреби
  // anonim — без перевірок

  next();
});

module.exports = mongoose.model("Invoice", InvoiceSchema);
