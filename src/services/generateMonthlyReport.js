const Expense = require("../schemas/finance/expense");
const OnlineSale = require("../schemas/sales/onlineSales");
const OfflineSale = require("../schemas/sales/offlineSales");
const Invoice = require("../schemas/accounting/InvoiceSchema");
const MonthlyReport = require("../schemas/accounting/monthlyReport"); // шляхи адаптуй

module.exports = async function generateMonthlyReport() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const currentMonth = now.getMonth(); // липень → верне 6
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const monthName = `${year}-${(previousMonth + 1)
      .toString()
      .padStart(2, "0")}`;

    const start = new Date(year, previousMonth, 1);
    const end = new Date(year, currentMonth, 0, 23, 59, 59);

    // Доходи
    const onlineAgg = await OnlineSale.aggregate([
      { $match: { saleDate: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const offlineAgg = await OfflineSale.aggregate([
      { $match: { saleDate: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    const online = onlineAgg[0]?.total || 0;
    const offline = offlineAgg[0]?.total || 0;
    const totalRevenue = online + offline;

    // Витрати з розбивкою
    const expenses = await Expense.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const totalExpenses = expenses.reduce((sum, item) => sum + item.total, 0);
    const byCategory = {};
    expenses.forEach((e) => (byCategory[e._id] = e.total));

    // Інвойси
    const invoices = await Invoice.find({ date: { $gte: start, $lte: end } })
      .select("number amount status date")
      .lean();

    // Звіт
    const report = new MonthlyReport({
      month: monthName,
      revenue: {
        online,
        offline,
        total: totalRevenue,
      },
      expenses: {
        total: totalExpenses,
        byCategory,
      },
      profit: totalRevenue - totalExpenses,
      invoices,
      generatedAt: new Date(),
    });

    await report.save();
    console.log(`📦 Monthly report for ${monthName} saved successfully`);
  } catch (error) {
    console.error("🔥 Error generating monthly report:", error);
  }
};
