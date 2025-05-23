const express = require("express");
const User = require("../../schemas/userSchema");
const Product = require("../../schemas/product");
const { authenticateUser } = require("../../middleware/authenticateUser");
const { sendAdminMessage } = require("../../config/emailService");
const Recent = require("../../schemas/recent");
const router = express.Router();

// 📌 Отримати особисті дані
router.get("/profile/info", authenticateUser, async (req, res) => {
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
router.put("/profile/info", authenticateUser, async (req, res) => {
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
router.get("/profile/address", authenticateUser, async (req, res) => {
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
router.put("/profile/address", authenticateUser, async (req, res) => {
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
router.delete("/profile", authenticateUser, async (req, res) => {
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
router.post("/profile/email", authenticateUser, async (req, res) => {
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
router.get("/recent", authenticateUser, async (req, res) => {
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

// 📌 Всі продукти для авторизованих користувачів (ціни доступні)
router.get("/products", authenticateUser, async (req, res) => {
  try {
    console.log("🛍 Fetching products for user:", req.user);

    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No user ID found." });
    }

    const products = await Product.find({});
    const formattedProducts = products.map((product) => ({
      _id: product._id,
      name: product.name,
      category: product.category,
      description: product.description,
      photoUrl: product.photoUrl,
      size: product.size,
      inStock: product.inStock,
      visible: product.visible,
      createdAt: product.createdAt,
      price: product.price, // ✅ Тепер ціна завжди передається!
    }));

    return res.json(formattedProducts);
  } catch (error) {
    console.error("🔥 Error fetching products:", error);
    return res.status(500).json({
      message: "Błąd pobierania produktów.",
      details: error.message,
    });
  }
});

module.exports = router;
