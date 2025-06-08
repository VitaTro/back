const mongoose = require("mongoose");

const SalesInvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  saleDate: { type: Date, default: Date.now },
});

SalesInvoiceSchema.pre("save", async function (next) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const monthString = currentMonth.toString().padStart(2, "0");

  const invoiceCount = await mongoose.model("SalesInvoice").countDocuments({
    saleDate: {
      $gte: new Date(`${currentYear}-${monthString}-01T00:00:00Z`),
      $lt: new Date(`${currentYear}-${monthString}-31T23:59:59Z`),
    },
  });

  this.invoiceNumber = `${invoiceCount + 1}/${monthString}/${currentYear}`;
  next();
});

module.exports = mongoose.model("SalesInvoice", SalesInvoiceSchema);
