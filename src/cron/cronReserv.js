const StockMovement = require("../schemas/accounting/stockMovement");
const Product = require("../schemas/product");
const offlineSales = require("../schemas/sales/offlineSales");
const { calculateStock } = require("../services/calculateStock");

module.exports = async function autoExpireReservations() {
  try {
    const now = new Date();

    const expiredReservations = await offlineSales.find({
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
          saleSource: "OfflineReservationExpired",
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

      reservation.status = "expired";
      reservation.isReservation = false;
      reservation.reservationExpiresAt = null;
      await reservation.save();
    }

    console.log(
      `⏳ Авто‑очищення резервів: повернуто ${expiredReservations.length}`,
    );
  } catch (error) {
    console.error("🔥 Error in reservation cleanup cron:", error);
  }
};
