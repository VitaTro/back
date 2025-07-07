const cron = require("node-cron");
const generateMonthlyReport = require("../services/generateMonthlyReport");

console.log("📅 Monthly report cron loaded.");

cron.schedule("0 0 1 * *", async () => {
  try {
    console.log("📊 Generating monthly financial report...");

    await generateMonthlyReport(); // сама логіка — окремо
    console.log("✅ Monthly report completed.");
  } catch (error) {
    console.error("🔥 Error generating monthly report:", error);
  }
});
