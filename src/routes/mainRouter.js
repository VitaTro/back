const express = require("express");
const { authenticateUser } = require("../middleware/authenticateUser");
const router = express.Router();
const User = require("../schemas/userSchema");
const Product = require("../schemas/product");

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
router.get("/user/main", authenticateUser, async (req, res) => {
  try {
    console.log("🟢 Fetching data for user:", req.user); // ✅ Логування для перевірки
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No user ID found." });
    }

    const user = await User.findById(req.user.id).populate(
      "shoppingCart wishlist"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const products = await Product.find({});

    return res.json({
      message: `Witamy, ${user.username}!`,
      shoppingCart: user.shoppingCart,
      wishlist: user.wishlist,
      products,
    });
  } catch (error) {
    console.error("🔥 Error fetching user main data:", error);
    return res
      .status(500)
      .json({
        message: "Błąd pobierania danych użytkownika.",
        details: error.message,
      });
  }
});

module.exports = router;
