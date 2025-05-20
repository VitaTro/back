const express = require("express");
const { authenticateUser } = require("../../middleware/authenticateUser");
const router = express.Router();

// ✅ Отримати основну інформацію для користувача (гості)
router.get("/", async (req, res) => {
  res.json({
    message: "Witamy! Zaloguj się, aby uzyskać więcej możliwości.",
    features: ["Przegląd produktów, Ogólne informacje, Kontakt"],
  });
});

// ✅ Повний доступ для залогованого користувача
router.get("/user", authenticateUser, async (req, res) => {
  try {
    res.json({
      message: `Witamy, ${req.user.name}!Uzyskałeś pełny dostęp.`,
      features: ["Wishlist", "Shopping Cart", "Orders", "Profile"],
    });
  } catch (error) {
    res.status(500).json({ message: "Błąd serwera" });
  }
});

// ✅ Автоматичне перенаправлення залогованого юзера на `/api/user/main`
router.get("/main", authenticateUser, async (req, res) => {
  res.redirect("/api/user/main");
});

module.exports = router;
