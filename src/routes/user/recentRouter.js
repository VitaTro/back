const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middleware/authenticateUser");
const Recent = require("../../schemas/recent");

// ✅ Отримати список останніх переглядів товарів
router.get("/", authenticateUser, async (req, res) => {
  try {
    const recentViews = await Recent.find({ userId: req.user.id })
      .populate("productId", "name photoUrl price")
      .sort({ viewedAt: -1 })
      .limit(20); // Показати останні 10 переглядів

    res.status(200).json(recentViews);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Nie udało się pobrać historii przeglądania" });
  }
});

module.exports = router;
