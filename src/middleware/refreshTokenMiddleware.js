const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = mongoose.models.User || require("../schemas/userSchema");
const Admin = mongoose.models.Admin || require("../schemas/adminSchema");

const generateAccessToken = (user) =>
  jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "15m" });
const generateRefreshToken = (user) =>
  jwt.sign(user, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(401).json({ message: "No refresh token provided" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // 🔍 Перевіряємо, чи це адмін чи користувач
    let user = await User.findById(decoded.id);
    let admin = await Admin.findById(decoded.id);

    if (!user && !admin)
      return res.status(403).json({ message: "Invalid refresh token" });

    // 📌 Вибираємо, кого авторизуємо
    const newAccessToken = generateAccessToken({
      id: user ? user._id : admin._id,
      role: user ? user.role : admin.role,
    });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};

module.exports = { refreshToken };
