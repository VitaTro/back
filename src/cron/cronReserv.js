const StockMovement = require("../schemas/accounting/stockMovement");
const Product = require("../schemas/product");
const OfflineSale = require("../schemas/sales/offlineSales");
const { calculateStock } = require("../services/calculateStock");
const { sendAdminMessage } = require("../config/emailService");

// 🔔 1. Сповіщення за день до закінчення
async function notifyExpireReservations() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const expiring = await OfflineSale.find({
      isReservation: true,
      status: "reserved",
      reservationExpiresAt: { $lte: tomorrow },
    });

    if (!expiring.length) return;

    await sendAdminMessage(
      "Резерви, що закінчуються завтра",
      `Увага! Завтра закінчується ${expiring.length} резервів. Перевір панель адміністратора.`,
    );

    console.log(
      `⏳ Сповіщення: ${expiring.length} резервів закінчуються завтра`,
    );
  } catch (error) {
    console.error("🔥 Error in expiring reservation notifier:", error);
  }
}

// ❌ 2. Автоматичне скасування прострочених резервів
async function autoExpireReservations() {
  try {
    const now = new Date();

    const expiredReservations = await OfflineSale.find({
      isReservation: true,
      status: "reserved",
      reservationExpiresAt: { $lt: now },
    });

    if (!expiredReservations.length) return;

    for (const reservation of expiredReservations) {
      for (const item of reservation.products) {
        await StockMovement.create({
          productId: item.productId,
          productIndex: item.index,
          productName: item.name,
          quantity: item.quantity,
          type: "return",
          unitPurchasePrice: item.price,
          price: item.price,
          saleSource: "OfflineReservation",
          relatedSaleId: reservation._id,
          date: new Date(),
          note: "Reservation expired automatically",
        });

        const productDoc = await Product.findById(item.productId);
        if (productDoc) {
          const stockCount = await calculateStock(item.index);
          productDoc.quantity = stockCount;
          productDoc.currentStock = stockCount;
          productDoc.inStock = stockCount > 0;
          await productDoc.save();
        }
      }

      reservation.status = "cancelled";
      reservation.isReservation = false;
      reservation.reservationExpiresAt = null;
      await reservation.save();
    }

    console.log(`⏳ Авто‑скасування: ${expiredReservations.length} резервів`);
  } catch (error) {
    console.error("🔥 Error in reservation cleanup cron:", error);
  }
}

// 📦 Експортуємо обидві функції
module.exports = {
  notifyExpireReservations,
  autoExpireReservations,
};
