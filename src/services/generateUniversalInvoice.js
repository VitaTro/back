const Invoice = require("../schemas/InvoiceSchema");
const generateInvoiceOffline = require("../config/invoicePdfGeneratorOffline");
const generateInvoiceOnline = require("../config/invoicePdfGenerator");

async function generateUniversalInvoice(source, options = {}) {
  const {
    mode = "offline", // "online" або "offline"
    buyerType = "anonim",
    buyerName = "",
    buyerAddress = "",
    buyerNIP = "",
  } = options;

  // 🧾 Формуємо номер фактури (INV-5/06/2025)
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const startOfMonth = new Date(year, now.getMonth(), 1);
  const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59);

  const existingCount = await Invoice.countDocuments({
    issueDate: { $gte: startOfMonth, $lte: endOfMonth },
  });

  const invoiceNumber = `INV-${existingCount + 1}/${month}/${year}`;
  const issueDate = now.toISOString().split("T")[0];

  // 🧾 Формуємо дані для PDF
  const items = source.products.map((p) => ({
    name: p.name,
    quantity: p.quantity,
    priceNetto: p.price,
    vat: 0,
    priceBrutto: p.price,
  }));

  const invoiceData = {
    invoiceNumber,
    issueDate,
    paymentMethod: source.paymentMethod,
    totalAmount: source.totalAmount,
    taxAmount: 0,
    items,
  };

  if (buyerType === "company" || buyerType === "przedsiębiorca") {
    invoiceData.buyerName = buyerName;
    invoiceData.buyerAddress = buyerAddress;
    invoiceData.buyerNIP = buyerNIP;
  }

  // 📄 Генеруємо PDF
  const generateFn =
    mode === "online" ? generateInvoiceOnline : generateInvoiceOffline;
  const pdfPath = await generateFn(invoiceData, buyerType);
  invoiceData.filePath = pdfPath;

  // 💾 Зберігаємо в базу
  const newInvoice = await Invoice.create({
    invoiceNumber,
    orderId: source.orderId || source._id,
    invoiceType: mode,
    totalAmount: source.totalAmount,
    paymentMethod: source.paymentMethod,
    issueDate: now,
    buyerType,
    buyerName: buyerName || undefined,
    buyerAddress: buyerAddress || undefined,
    buyerNIP:
      buyerType === "company" || buyerType === "przedsiębiorca"
        ? buyerNIP
        : undefined,
    filePath: pdfPath,
    userId: source.userId || null,
  });

  return newInvoice;
}

module.exports = generateUniversalInvoice;
