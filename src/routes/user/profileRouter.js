const express = require("express");
const User = require("../../schemas/userSchema");
const { authenticateUser } = require("../../middleware/authenticateUser");
const { sendAdminMessage } = require("../../config/emailService");
const router = express.Router();

// 📌 Отримати особисті дані
router.get("/info", authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name email");
    if (!user) {
      return res
        .status(404)
        .json({ message: "Użytkownik nie został znaleziony" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching profile info:", error);
    res.status(500).json({ message: "Błąd serwera" });
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
      return res
        .status(404)
        .json({ message: "Użytkownik nie został znaleziony" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile info:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// 🏠 Отримати адресу
router.get("/address", authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("address");
    if (!user) {
      return res
        .status(404)
        .json({ message: "Użytkownik nie został znaleziony" });
    }
    res.json(user.address);
  } catch (error) {
    console.error("Error fetching address:", error);
    res.status(500).json({ message: "Błąd serwera" });
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
      return res
        .status(404)
        .json({ message: "Użytkownik nie został znaleziony" });
    }

    res.json(updatedUser.address);
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// ❌ Видалити акаунт
router.delete("/", authenticateUser, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.user.id);
    if (!deletedUser) {
      return res
        .status(404)
        .json({ message: "Użytkownik nie został znaleziony" });
    }
    res.json({ message: "Konto zostało pomyślnie usunięte" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Błąd serwera" });
  }
});
router.post("/email", authenticateUser, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message)
      return res
        .status(400)
        .json({ error: "Należy podać temat i treść wiadomości" });

    await sendAdminMessage(subject, message);

    res
      .status(201)
      .json({ message: "List do administratora został pomyślnie wysłany!" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Nie udało się wysłać wiadomości do administratora." });
  }
});
module.exports = router;
