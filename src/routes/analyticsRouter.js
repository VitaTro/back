const express = require("express");
const Analytics = require("../schemas/Analytics");
const authenticateOptional = require("../middleware/authenticateOptional");
const router = express.Router();

router.post("/visit", authenticateOptional, async (req, res) => {
  try {
    const { page } = req.body;

    if (!page) {
      return res.status(400).json({ error: "Page is required" });
    }

    // 🔥 1. Не рахуємо адміна
    if (req.user && req.user.role === "admin") {
      return res.json({ success: true, skipped: true });
    }

    // 🔥 2. Не рахуємо адмінські сторінки
    if (page.startsWith("/admin")) {
      return res.json({ success: true, skipped: true });
    }

    // 🔥 3. Дата у форматі YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10);

    // 🔥 4. Шукаємо запис за сьогодні
    const record = await Analytics.findOne({ page, date: today });

    if (record) {
      record.count += 1;
      await record.save();
    } else {
      await Analytics.create({ page, date: today, count: 1 });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("🔥 Analytics error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
