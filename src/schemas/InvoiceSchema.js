const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // опціонально для офлайну
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  invoiceType: { type: String, enum: ["online", "offline"], required: true },

  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
  },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  invoiceNumber: { type: String, required: true, unique: true },
  filePath: { type: String },

  buyerType: {
    type: String,
    enum: ["company", "individual", "anonim"],
    required: true,
  },
  buyerName: { type: String },
  buyerAddress: { type: String },
  buyerNIP: { type: String },
});

// 🛡️ Кастомна перевірка згідно типу покупця
InvoiceSchema.pre("validate", function (next) {
  if (this.buyerType === "company") {
    if (!this.buyerName || !this.buyerAddress || !this.buyerNIP) {
      return next(
        new Error(
          "Для компанії потрібно вказати buyerName, buyerAddress та buyerNIP"
        )
      );
    }
  }

  // для individual або anonim — нічого не перевіряємо
  next();
});

module.exports = mongoose.model("Invoice", InvoiceSchema);
