const mongoose = require("mongoose");
const User = mongoose.models.User || require("../schemas/userSchema");

const isAuthenticated = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: No user data" });
    }

    // 🔍 Отримуємо юзера, приховуючи пароль
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 📌 Додаємо роль для перевірки доступу
    req.user = { id: user._id, email: user.email, role: user.role };

    next();
  } catch (error) {
    console.error("Authentication Error:", error);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

module.exports = { isAuthenticated };
