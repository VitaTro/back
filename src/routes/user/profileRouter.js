const express = require("express");
const router = express.Router();

const { authenticateUser } = require("../../middleware/authenticateUser");
const { sendAdminMessage } = require("../../config/emailService");

const User = require("../../schemas/userSchema");
const Product = require("../../schemas/product");
const Recent = require("../../schemas/recent");

// 👤 Отримати особисті дані
router.get("/profile/info", authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("username email firstName lastName phone")
      .lean();

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
    const { username, email, firstName, lastName, phone } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { username, email, firstName, lastName, phone },
      { new: true, runValidators: true },
    ).select("username email firstName lastName phone");

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
    const user = await User.findById(req.user.id).select("address").lean();

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
      { new: true, runValidators: true },
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

// ✉️ Надіслати повідомлення адміну
router.post("/profile/email", authenticateUser, async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res
        .status(400)
        .json({ error: "Należy podać temat i treść wiadomości" });
    }

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

// 🕓 Отримати історію переглядів
router.get("/recent", authenticateUser, async (req, res) => {
  try {
    const recentViews = await Recent.find({ userId: req.user.id })
      .populate("productId", "name photoUrl price category subcategory")
      .sort({ viewedAt: -1 })
      .limit(20);

    res.status(200).json(recentViews);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Nie udało się pobrać historii przeglądania" });
  }
});

// 🛍 Всі продукти (авторизований доступ)
router.get("/products", authenticateUser, async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// 🧾 Деталі конкретного товару
router.get("/products/:id", authenticateUser, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error.message);
    res.status(500).json({
      error: "Failed to fetch product details.",
      details: error.message,
    });
  }
});
// 💰 Отримати поточний баланс
router.get("/wallet", authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("wallet").lean();
    res.status(200).json({ wallet: user.wallet });
  } catch (error) {
    res.status(500).json({ error: "Nie udało się pobrać salda portfela" });
  }
});

// ⚙️ Отримати налаштування
router.get("/settings", authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("settings").lean();
    res.status(200).json(user.settings || { allowWalletUsage: true });
  } catch (error) {
    res.status(500).json({ error: "Nie udało się pobrać ustawień" });
  }
});

// ⚙️ Оновити налаштування
router.put("/settings", authenticateUser, async (req, res) => {
  try {
    const { allowWalletUsage } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { "settings.allowWalletUsage": !!allowWalletUsage },
      { new: true, runValidators: true },
    ).select("settings");

    res.status(200).json(updated.settings);
  } catch (error) {
    res.status(500).json({ error: "Nie udało się zaktualizować ustawień" });
  }
});
router.get("/main", authenticateUser, async (req, res) => {
  try {
    console.log("🟢 Fetching data for user:", req.user);

    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No user ID found." });
    }

    const user = await User.findById(req.user.id).populate(
      "shoppingCart wishlist",
    );
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      message: `Witamy, ${user.username}!`,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        shoppingCart: user.shoppingCart || [],
        wishlist: user.wishlist || [],
      },
    });
  } catch (error) {
    console.error("🔥 Error fetching user data:", error);
    return res.status(500).json({
      message: "Błąd pobierania danych użytkownika.",
      details: error.message,
    });
  }
});

module.exports = router;
