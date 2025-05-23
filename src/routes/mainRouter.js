const express = require("express");
const { authenticateUser } = require("../middleware/authenticateUser");
const router = express.Router();
const User = require("../schemas/userSchema");

// ✅ Дані для гостей (без цін)
router.get("/main", async (req, res) => {
  try {
    const products = await Product.find({}, "name description");
    return res.json({
      message: "Witamy!",
      products,
      note: "Zaloguj się, aby zobaczyć więcej szczegółów.",
    });
  } catch (error) {
    console.error("Error fetching guest product data:", error);
    return res
      .status(500)
      .json({ message: "Błąd pobierania danych dla gości." });
  }
});

// ✅ Дані для авторизованих користувачів (повний доступ)
router.get("/api/user/main", authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "shoppingCart wishlist"
    );
    const products = await Product.find({});

    return res.json({
      message: `Witamy, ${user.username}!`,
      shoppingCart: user.shoppingCart,
      wishlist: user.wishlist,
      products,
    });
  } catch (error) {
    console.error("Error fetching user main data:", error);
    return res
      .status(500)
      .json({ message: "Błąd pobierania danych użytkownika." });
  }
});

module.exports = router;
