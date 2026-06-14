const express = require("express");
const Analytics = require("../schemas/Analytics");
const authenticateOptional = require("../middleware/authenticateOptional");
const router = express.Router();

router.post("/visit", authenticateOptional, async (req, res) => {
  try {
    // 🔥 1. Якщо адмін — не рахуємо
    if (req.user && req.user.role === "admin") {
      return res.json({ success: true, skipped: true });
    }

    const { page } = req.body;

    if (!page) {
      return res.status(400).json({ error: "Page is required" });
    }

    const today = new Date().toISOString().slice(0, 10);

    const record = await Analytics.findOne({ page, date: today });

    if (record) {
      record.count += 1;
      await record.save();
    } else {
      await Analytics.create({ page, date: today });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
