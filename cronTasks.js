const cron = require("node-cron");
const OfflineSale = require("./src/schemas/finance/offlineSales");

// Запуск `cron`-задачі кожен день о 2:00 ночі
console.log("✅ cronTasks.js loaded!");

cron.schedule("0 2 * * *", async () => {
  try {
    console.log("🔍 Checking for sales older than 1 month...");

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const updatedSales = await OfflineSale.updateMany(
      { saleDate: { $lte: oneMonthAgo }, archived: false },
      { $set: { archived: true } }
    );

    console.log(`✅ Archived ${updatedSales.modifiedCount} sales.`);
  } catch (error) {
    console.error("🔥 Error archiving old sales:", error);
  }
});

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
