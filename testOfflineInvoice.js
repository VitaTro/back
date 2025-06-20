require("dotenv").config();
require("./server");

const mongoose = require("mongoose");
const OfflineSale = require("./src/schemas/finance/offlineSales");
const generateUniversalInvoice = require("./src/services/generateUniversalInvoice");

(async () => {
  try {
    const saleId = "68553df93384d119cd585109"; // 👉 встав потрібний ID

    console.log("📦 Пошук продажу:", saleId);
    const sale = await OfflineSale.findById(saleId);

    if (!sale) {
      console.error("⛔ Продаж не знайдено");
      process.exit(1);
    }

    const invoice = await generateUniversalInvoice(sale, {
      mode: "offline",
      buyerType: "anonim", // або "przedsiębiorca" + реквізити
    });

    console.log("\n✅ Фактура створена!");
    console.log("🧾 Номер:", invoice.invoiceNumber);
    console.log("📥 PDF:", invoice.filePath);
    console.log("☁️ fileUrl:", invoice.fileUrl || "(ще не згенеровано)");

    process.exit(0);
  } catch (err) {
    console.error("❌ Помилка:", err.message);
    process.exit(1);
  }
})();
