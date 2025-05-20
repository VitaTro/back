const express = require("express");
const User = require("../../schemas/userSchema");
const { authenticateUser } = require("../../middleware/authenticateUser");
const router = express.Router();

// 📌 Отримати особисті дані
router.get("/info", authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name email");
    if (!user) {
      return res.status(404).json({ message: "Користувач не знайдений" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching profile info:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

// ✏️ Оновити особисті дані
router.put("/info", authenticateUser, async (req, res) => {
  try {
    const { name, email } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true, runValidators: true }
    ).select("name email");

    if (!updatedUser) {
      return res.status(404).json({ message: "Користувач не знайдений" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile info:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

// 🏠 Отримати адресу
router.get("/address", authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("address");
    if (!user) {
      return res.status(404).json({ message: "Користувач не знайдений" });
    }
    res.json(user.address);
  } catch (error) {
    console.error("Error fetching address:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

// ✏️ Оновити адресу
router.put("/address", authenticateUser, async (req, res) => {
  try {
    const { address } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { address },
      { new: true, runValidators: true }
    ).select("address");

    if (!updatedUser) {
      return res.status(404).json({ message: "Користувач не знайдений" });
    }

    res.json(updatedUser.address);
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

// ❌ Видалити акаунт
router.delete("/", authenticateUser, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.user.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "Користувач не знайдений" });
    }
    res.json({ message: "Акаунт успішно видалено" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Помилка сервера" });
  }
});

module.exports = router;
