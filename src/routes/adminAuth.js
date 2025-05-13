const express = require("express");
const router = express.Router();
const sendEmail = require("../../emailService");
const User = require("../schemas/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

router.post("/register", async (req, res) => {
  const { username, email, password, adminSecret } = req.body;

  // 🔐 Перевірка секретного ключа для адміна
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: "Invalid Admin Secret Key" });
  }

  try {
    // 🛡️ Хешування пароля
    const hashedPassword = bcrypt.hashSync(password, 10);

    // 📌 Створення нового адміна
    const newAdmin = new User({
      username,
      email,
      password: hashedPassword,
      role: "admin",
    });
    await newAdmin.save();

    // ✉️ Надсилання email-підтвердження
    await sendEmail(
      email,
      "Адміністратор успішно зареєстрований!",
      `Вітаємо, ${username}! Ваш обліковий запис адміністратора створено успішно. Тепер ви можете увійти на платформу.`
    );

    res
      .status(201)
      .json({ message: "Admin registered successfully! Email sent." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Registration failed", details: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 🔍 Шукаємо адміна
    const user = await User.findOne({ email, role: "admin" });
    if (!user) {
      return res.status(403).json({ message: "Admin not found" });
    }

    // 🔥 Лог пароля перед перевіркою
    console.log("Entered password:", password);
    console.log("Stored hashed password:", user.password);

    // 🛡️ Перевірка пароля
    const isPasswordCorrect = bcrypt.compareSync(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(403).json({ message: "Invalid password" });
    }

    // 🎫 Генеруємо JWT-токен
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    // ✉️ Сповіщення про успішний логін
    await sendEmail(
      email,
      "Вхід адміністратора",
      `Вітаємо, ${user.username}! Ви успішно увійшли до адміністративної панелі.`
    );

    // 🔀 Відповідь з токеном
    res.json({ message: "Login successful", token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed", details: error.message });
  }
});

router.post("/send-email", async (req, res) => {
  const { to, subject, text } = req.body;

  try {
    await sendEmail(to, subject, text);
    res.status(200).json({ message: "Email sent successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to send email", details: error.message });
  }
});

router.post("/logout", async (req, res) => {
  try {
    // 🔐 Очищуємо токен на клієнті
    res.json({ message: "Admin logged out successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Logout failed", details: error.message });
  }
});

module.exports = router;
