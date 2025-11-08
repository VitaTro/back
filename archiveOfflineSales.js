// require("dotenv").config(); // підтягуємо .env

// const mongoose = require("mongoose");
// const OfflineSale = require("./src/schemas/sales/offlineSales"); // заміни шлях, якщо інший
// const OfflineSaleArchive = require("./src/schemas/sales/OfflineSaleArchive");

// async function archiveOfflineSales() {
//   try {
//     const mongoUri = process.env.MONGO_URI;

//     if (!mongoUri) {
//       throw new Error("❌ MONGO_URI не вказано в .env файлі");
//     }

//     await mongoose.connect(mongoUri, { dbName: "nika" });
//     console.log("✅ Підключено до MongoDB");

//     const sales = await OfflineSale.find({});
//     console.log(`📦 Знайдено ${sales.length} записів`);

//     if (sales.length === 0) {
//       console.log("ℹ️ Немає даних для архівації");
//       return;
//     }

//     await OfflineSaleArchive.insertMany(sales);
//     console.log("📁 Успішно перенесено в offlineSalesArchive");

//     await OfflineSale.deleteMany({});
//     console.log("🧹 Основна колекція очищена");

//     console.log(
//       "🎉 Готово! Всі офлайн-продажі збережено, склад чекає на оновлення"
//     );
//   } catch (error) {
//     console.error("❌ Сталася помилка:", error);
//   } finally {
//     await mongoose.disconnect();
//     console.log("🔌 З'єднання з MongoDB завершено");
//   }
// }

// archiveOfflineSales();
