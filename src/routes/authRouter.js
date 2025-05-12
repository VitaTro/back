const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../schemas/user");
const { authenticateJWT, isAdmin } = require("../middleware/authMiddleware");
const sendEmail = require("../../emailService");
const router = express.Router();
const secret = process.env.JWT_SECRET;

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, secret, {
    expiresIn: "1h",
  });
};

// Маршрут для перевірки статусу адміністратора
router.get("/check-admin", async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" });
    const isFirstAdmin = admins.length === 0;
    res.status(200).json({ isFirstAdmin });
  } catch (error) {
    res.status(500).json({ error: "Failed to check admin status" });
  }
});

// 📝 Реєстрація користувача + email-підтвердження
router.post("/register/user", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: "user",
      isVerified: false,
    });
    await newUser.save();

    // 🔥 Генеруємо токен підтвердження email
    const verifyToken = jwt.sign({ id: newUser._id }, secret, {
      expiresIn: "24h",
    });

    // 📧 Надсилаємо email з посиланням на верифікацію
    await sendEmail(
      email,
      "Verify Your Email",
      `Click the link to verify your email: ${process.env.FRONTEND_URL}/verify-email?token=${verifyToken}`
    );

    res
      .status(201)
      .json({ message: "User registered! Please verify your email." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Registration failed", details: error.message });
  }
});

// 🔄 Верифікація email через посилання
router.get("/verify-email", async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isVerified = true;
    await user.save();

    res.json({ message: "Email verified successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Verification failed", details: error.message });
  }
});
// 🛡️ Реєстрація адміністратора (з перевіркою секретного ключа)
router.post("/register/admin", async (req, res) => {
  const { username, email, password, adminSecret } = req.body;
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: "Invalid Admin Secret Key" });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newAdmin = new User({
      username,
      email,
      password: hashedPassword,
      role: "admin",
    });
    await newAdmin.save();
    res.status(201).json({ message: "Admin registered successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Registration failed", details: error.message });
  }
});

// 🔑 Логін
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(403).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);
    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed", details: error.message });
  }
});

// 🚪 Логаут (технічно не потрібен, але можна зробити для фронтенду)
router.post("/logout", (req, res) => {
  res.json({ message: "Logout successful!" });
});

// 🔄 Оновлення токена
router.post("/refresh-token", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const newToken = generateToken(user);
    res.json({ accessToken: newToken });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to refresh token", details: error.message });
  }
});

router.post("/reset-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Генерація токена для скидання пароля (дійсний 1 годину)
    const resetToken = jwt.sign({ id: user._id }, secret, { expiresIn: "1h" });

    // **Імітація** надсилання email (в реальності використовують Nodemailer)
    await sendEmail(
      email,
      "Password Reset Request",
      `Click the link below to reset your password:\n${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    );

    res.json({ message: "Password reset link sent to your email!" });
  } catch (error) {
    console.error("Email send error:", error);
    res.status(500).json({ error: "Failed to send reset email" });
  }
});

// 🔑 Оновлення пароля (після отримання токена)
router.post("/update-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = bcrypt.hashSync(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to update password", details: error.message });
  }
});
// 🔐 Захищений маршрут, доступний лише адміністраторам
router.get("/admin-dashboard", authenticateJWT, isAdmin, (req, res) => {
  res.json({ message: "Welcome, Admin!" });
});

module.exports = router;
