const Invoice = require("../schemas/accounting/InvoiceSchema");
const generateInvoicePDF = require("../config/invoicePdfGenerator");
const uploadToDrive = require("../services/uploadToDrive");

async function generateUniversalInvoice(source, options = {}) {
  console.log("🔧 Виклик генерації: source=", source, "options=", options);

  const {
    mode = "offline",
    buyerType = "anonim",
    buyerName = "",
    buyerAddress = "",
    buyerNIP = "",
  } = options;

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
  } else {
    invoiceData.buyerName = buyerName;
    invoiceData.buyerAddress = buyerAddress;
  }

  const pdfPath = await generateInvoicePDF(invoiceData, buyerType);
  invoiceData.filePath = pdfPath;
  console.log("⚡ Завантажуємо файл в Google Drive...");

  if (!pdfPath) {
    console.error("❌ PDF шлях не отримано! Генерація провалилася.");
    return null;
  }

  // const publicUrl = await uploadToDrive(pdfPath, `${invoiceNumber}.pdf`);
  // console.log("✅ Файл завантажено, лінк:", publicUrl);

  // invoiceData.fileUrl = publicUrl;

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
    // fileUrl: publicUrl,
  });

  return newInvoice;
}

module.exports = generateUniversalInvoice;
