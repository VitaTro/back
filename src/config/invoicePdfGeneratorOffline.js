const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

async function invoicePdfGeneratorOffline(invoiceData, type) {
  const doc = new PDFDocument();
  const invoicesDir = path.join(__dirname, "./invoices");

  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }

  const fontPath = path.join(__dirname, "../fonts/NotoSans-Regular.ttf");
  doc.registerFont("Noto", fontPath);
  doc.font("Noto");

  const safeFileName = invoiceData.invoiceNumber.replace(/\//g, "_");
  const fileName = path.join(invoicesDir, `${safeFileName}.pdf`);
  doc.pipe(fs.createWriteStream(fileName));

  doc
    .fontSize(16)
    .text(`FAKTURA VAT: ${invoiceData.invoiceNumber}`, { align: "center" });
  doc.fontSize(12).text(`Data wystawienia: ${invoiceData.issueDate}`);
  doc.text(`Metoda płatności: ${invoiceData.paymentMethod}`);
  doc.text(`Kwota brutto: ${invoiceData.totalAmount} PLN`);
  doc.moveDown();

  doc.text(`Sprzedawca:`);
  doc.text(`Nika Gold - Vitaliia Troian`);
  doc.text(`NIP: 9121950449`);
  doc.text(`ul. Świeradowska 51/57, 50-559 Wrocław`);
  doc.moveDown();

  if (type === "przedsiębiorca") {
    doc.text(`Nabywca: ${invoiceData.buyerName}`);
    doc.text(`Adres: ${invoiceData.buyerAddress}`);
    doc.text(`NIP: ${invoiceData.buyerNIP}`);
  } else {
    doc.text(`Nabywca: Anonimowy klient`);
  }

  doc.text(`-----------------------------------------`);
  doc.text(
    `Lp   Nazwa               Ilość   Cena Netto   VAT   Wartość Brutto`
  );

  invoiceData.items.forEach((item, index) => {
    doc.text(
      `${index + 1}. ${item.name}   ${item.quantity}   ${
        item.priceNetto
      } PLN   ${item.vat}%   ${item.priceBrutto} PLN`
    );
  });

  doc.text(`-----------------------------------------`);
  doc.text(`Razem brutto: ${invoiceData.totalAmount} PLN`);
  doc.text(`Kwota VAT: ${invoiceData.taxAmount} PLN`);
  doc.moveDown();

  doc.text(`Wystawił(a): AUTOMAT Nika Gold - Vitaliia Troian`);
  doc.text(`Odebrał(a): ________________________`);

  doc.end();
  return fileName;
}

module.exports = invoicePdfGeneratorOffline;
