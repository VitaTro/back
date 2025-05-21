const express = require("express");
const { authenticateUser } = require("../../middleware/authenticateUser");
const router = express.Router();

// ✅ Отримати основну інформацію для користувача (гості)
router.get(["/", "/main"], (req, res) => {
  res.json({
    message: "Witamy!",
    products: [
      { name: "Product 1", description: "Opis produktu" },
      { name: "Product 2", description: "Opis produktu" },
    ],
    note: "Zaloguj się, aby zobaczyć więcej szczegółów.",
  });
});

router.get("/api/user/main", authenticateUser, (req, res) => {
  res.json({
    message: `Witamy, ${req.user.name}!`,
    products: [
      { name: "Product 1", price: "$10", wishlist: true },
      { name: "Product 2", price: "$20", wishlist: false },
    ],
  });
});

module.exports = router;
