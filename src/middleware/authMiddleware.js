const jwt = require("jsonwebtoken");
const User = require("../schemas/user");

// ✅ Функція для вилучення токена з заголовків
const extractToken = (req) => req.headers.authorization?.split(" ")[1];

// 🔐 Перевірка JWT токена
const authenticateJWT = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next(); // ✅ Продовжуємо тільки якщо перевірка успішна
  } catch (error) {
    console.error("JWT Error:", error);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

// 🔎 Перевірка ролі користувача
const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: "Access denied: No user found" });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    next(); // ✅ Дозволяємо доступ
  } catch (error) {
    console.error("Admin Check Error:", error);
    return res
      .status(500)
      .json({ message: "Server error during authentication" });
  }
};

// 🛡️ Перевірка авторизації (чи користувач залогінений)
const isAuthenticated = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: No user data" });
    }

    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user; // ✅ Додаємо користувача в req
    next();
  } catch (error) {
    console.error("Authentication Error:", error);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

module.exports = { authenticateJWT, isAdmin, isAuthenticated };
