const express = require("express");
const router = express.Router();
const Expense = require("../../schemas/finance/expense");
const { authenticateAdmin } = require("../../middleware/authenticateAdmin");

// ✅ Додати нову витрату
router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const { category, amount, invoiceNumber, date, note } = req.body;

    if (!category || !amount) {
      return res
        .status(400)
        .json({ error: "Category and amount are required" });
    }

    const newExpense = await Expense.create({
      category,
      amount,
      invoiceNumber,
      date,
      note,
    });

    res
      .status(201)
      .json({ message: "Expense added successfully", expense: newExpense });
  } catch (error) {
    console.error("🔥 Error adding expense:", error);
    res.status(500).json({ error: "Failed to add expense" });
  }
});

// ✅ Отримати всі витрати (можна буде ще фільтрувати по датах)
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.status(200).json({ expenses });
  } catch (error) {
    console.error("🔥 Error fetching expenses:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

module.exports = router;
