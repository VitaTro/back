const cron = require("node-cron");
const OfflineSale = require("../schemas/sales/offlineSales");
const Payment = require("../schemas/paymentSchema");
const OnlineOrder = require("../schemas/orders/onlineOrders");
require("events").EventEmitter.defaultMaxListeners = 20;

// Запуск `cron`-задачі кожен день о 2:00 ночі
console.log("✅ cronTasks.js loaded!");

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

// 🔄 Перевірка статусів Elavon Payment Links кожні 2 хвилини
cron.schedule("*/2 * * * *", async () => {
  try {
    console.log("🔍 Sprawdzanie statusów płatności Elavon...");

    const pendingPayments = await Payment.find({
      status: "pending",
      paymentMethod: "elavon_link",
      paymentLinkId: { $exists: true, $ne: null },
    });

    for (const payment of pendingPayments) {
      const authHeader =
        "Basic " +
        Buffer.from(
          `${process.env.ELAVON_PUBLIC_KEY}:${process.env.ELAVON_SECRET_KEY}`,
        ).toString("base64");

      const response = await axios.get(
        `https://uat.api.converge.eu.elavonaws.com/payment-links/${payment.paymentLinkId}`,
        {
          headers: {
            Accept: "application/json;charset=UTF-8",
            Authorization: authHeader,
            "Accept-Version": "1",
          },
        },
      );

      const status = response.data.status?.[0];

      if (status === "completed") {
        console.log(`💰 Płatność ${payment._id} została zakończona.`);

        payment.status = "paid";
        await payment.save();

        const order = await OnlineOrder.findById(payment.orderId);
        if (order) {
          order.paymentStatus = "paid";
          order.status = "completed";
          await order.save();
        }
      }
    }
  } catch (error) {
    console.error("🔥 Błąd podczas sprawdzania płatności Elavon:", error);
  }
});
