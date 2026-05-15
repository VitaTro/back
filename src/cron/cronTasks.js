const cron = require("node-cron");
const OfflineSale = require("../schemas/sales/offlineSales");
const StockMovement = require("../schemas/accounting/stockMovement");
const { calculateStock } = require("../services/calculateStock");
const Product = require("../schemas/product");

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

cron.schedule("0 1 * * *", async () => {
  try {
    console.log("🔍 Checking expired offline reservations...");

    const now = new Date();

    const expired = await OfflineSale.find({
      status: "reserved",
      isReservation: true,
      reservationExpiresAt: { $lte: now },
    });

    for (const sale of expired) {
      console.log(`⏳ Reservation expired for sale ${sale._id}`);
      // повертаємо товар на склад
      for (const item of sale.products) {
        await StockMovement.create({
          productId: item.productId,
          productIndex: item.index,
          productName: item.name,
          quantity: item.quantity,
          type: "return",
          unitPurchasePrice: item.price,
          price: item.price,
          saleSource: "OfflineReservationExpired",
          relatedSaleId: sale._id,
          date: new Date(),
          note: "Offline reservation expired — returned to stock",
        });
        // оновлюємо кількість у Product
        const productDoc = await Product.findById(item.productId);
        if (productDoc) {
          const stockCount = await calculateStock(item.index);
          productDoc.quantity = stockCount;
          productDoc.currentStock = stockCount;
          productDoc.inStock = stockCount > 0;
          await productDoc.save();
        }
      }

      sale.status = "cancelled";
      sale.isReservation = false;
      await sale.save();
    }
    console.log(`✅ Processed ${expired.length} expired offline reservations.`);
  } catch (error) {
    console.error("🔥 Error processing offline reservations:", error);
  }
});
