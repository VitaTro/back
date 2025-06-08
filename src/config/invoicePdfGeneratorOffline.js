const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

async function invoicePdfGeneratorOffline(invoiceData, type) {
  const doc = new PDFDocument();
  const fileName = path.join(
    __dirname,
    "../invoices/",
    `${invoiceData.invoiceNumber}.pdf`
  );
  doc.pipe(fs.createWriteStream(fileName));

  doc
    .fontSize(16)
    .text(`FAKTURA VAT: ${invoiceData.invoiceNumber}`, { align: "center" });
  doc.fontSize(12).text(`Data wystawienia: ${invoiceData.issueDate}`);
  doc.text(`Metoda płatności: ${invoiceData.paymentMethod}`);
  doc.text(`Kwota brutto: ${invoiceData.totalAmount} PLN`);
  doc.moveDown();

  doc.fontSize(12).text(`Sprzedawca:`);
  doc.text(`Nika Gold - Vitaliia Troian`);
  doc.text(`NIP: 9121950449`);
  doc.text(`ul. Świeradowska 51/57, 50-559 Wrocław`);
  doc.moveDown();

  if (type === "przedsiębiorca") {
    doc.fontSize(12).text(`Nabywca: ${invoiceData.buyerName}`);
    doc.text(`Adres: ${invoiceData.buyerAddress}`);
    doc.text(`NIP: ${invoiceData.buyerNIP}`);
  } else {
    doc.fontSize(12).text(`Nabywca: Anonimowy klient`);
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
  doc.moveDown();

  doc.end();
  return fileName;
}

module.exports = invoicePdfGeneratorOffline;
