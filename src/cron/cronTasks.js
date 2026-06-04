const cron = require("node-cron");
const OfflineSale = require("../schemas/sales/offlineSales");
const StockMovement = require("../schemas/accounting/stockMovement");
const { calculateStock } = require("../services/calculateStock");
const Product = require("../schemas/product");
const {
  autoExpireReservations,
  notifyExpireReservations,
} = require("./cronReserv");

require("events").EventEmitter.defaultMaxListeners = 20;

console.log("✅ cronTasks.js loaded!");

// 🟡 Архівація продажів старших за 1 місяць
cron.schedule("0 2 * * *", async () => {
  try {
    console.log("🔍 Checking for sales older than 1 month...");

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const updatedSales = await OfflineSale.updateMany(
      { saleDate: { $lte: oneMonthAgo }, archived: false },
      { $set: { archived: true } },
    );

    console.log(`✅ Archived ${updatedSales.modifiedCount} sales.`);
  } catch (error) {
    console.error("🔥 Error archiving old sales:", error);
  }
});

// 🟡 Видалення продажів старших за 3 роки
cron.schedule("0 3 * * *", async () => {
  try {
    console.log("🗑 Checking for sales older than 3 years...");

    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const deletedSales = await OfflineSale.deleteMany({
      saleDate: { $lte: threeYearsAgo },
    });

    console.log(`✅ Deleted ${deletedSales.deletedCount} outdated sales.`);
  } catch (error) {
    console.error("🔥 Error deleting old sales:", error);
  }
});
cron.schedule("0 8 * * *", () => {
  notifyExpireReservations();
});
// авто повернення резервів, якщо я не провела вчасно продаж
cron.schedule("*/10 * * * *", () => {
  autoExpireReservations();
});
