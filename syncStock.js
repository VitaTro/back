// require("dotenv").config();
// const mongoose = require("mongoose");
// const OfflineSale = require("./src/schemas/sales/offlineSales");
// const Invoice = require("./src/schemas/accounting/InvoiceSchema");
// const invoicePdfGeneratorOffline = require("./src/config/invoicePdfGeneratorOffline");

// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// async function run() {
//   try {
//     const saleId = "68752fd8128ca8cfc811c32b";
//     const sale = await OfflineSale.findById(saleId);

//     if (!sale) throw new Error("❌ Продаж не знайдено");

//     const invoiceData = {
//       invoiceNumber: "NP2025/002",
//       issueDate: sale.saleDate,
//       paymentMethod: sale.paymentMethod,
//       totalAmount: sale.totalAmount,
//       taxAmount: sale.totalAmount * 0.23,
//       buyerName: sale.buyerName || "Anonimowy klient",
//       buyerAddress: sale.buyerAddress || "—",
//       buyerNIP: sale.buyerNIP || "—",
//       items: sale.products.map((p) => ({
//         name: p.name,
//         quantity: p.quantity,
//         priceNetto: (p.price / 1.23).toFixed(2),
//         vat: 23,
//         priceBrutto: p.price,
//       })),
//     };

//     const pdfPath = await invoicePdfGeneratorOffline(
//       invoiceData,
//       sale.buyerType
//     );

//     const invoice = new Invoice({
//       orderId: sale.orderId,
//       invoiceType: "offline",
//       totalAmount: sale.totalAmount,
//       paymentMethod: sale.paymentMethod,
//       buyerType: sale.buyerType,
//       ...(sale.buyerType === "przedsiębiorca" && {
//         buyerName: sale.buyerName,
//         buyerAddress: sale.buyerAddress,
//         buyerNIP: sale.buyerNIP,
//       }),
//       filePath: pdfPath,
//     });

//     await invoice.save();
//     console.log("✅ Інвойс успішно створено й збережено!");
//   } catch (error) {
//     console.error("🔥 Помилка генерації інвойсу:", error);
//   } finally {
//     mongoose.connection.close();
//   }
// }

// run();
