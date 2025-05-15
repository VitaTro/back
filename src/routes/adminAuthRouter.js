const express = require("express");
const router = express.Router();
const { sendEmail } = require("../../emailService");
const User = require("../schemas/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Auth = require("../schemas/auth");

router.post("/register", async (req, res) => {
  const { username, email, password, adminSecret } = req.body;

  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: "Invalid Admin Secret Key" });
  }

  try {
    const existingAdmin = await Auth.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    // 🛡️ **Зберігаємо пароль у `Auth`**
    const newAdminAuth = new Auth({ email });
    newAdminAuth.setPassword(password);
    await newAdminAuth.save();

    // 📌 **Зберігаємо загальні дані у `User`**
    const newAdminUser = new User({ username, email, role: "admin" });
    await newAdminUser.save();

    await sendEmail(
      email,
      "Welcome Admin!",
      `Hello ${username}, your admin account is now active!`
    );

    res.status(201).json({ message: "Admin registered successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Registration failed", details: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 🔍 **Шукаємо адміна в `Auth`, бо там пароль**
    const adminAuth = await Auth.findOne({ email });
    if (!adminAuth || !adminAuth.validPassword(password)) {
      return res.status(403).json({ message: "Invalid credentials" });
    }

    // 🎫 **Шукаємо загальні дані в `User`**
    const adminUser = await User.findOne({ email });

    // 🎟 Генеруємо токен
    const token = jwt.sign(
      { id: adminUser._id, role: adminUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    await sendEmail(
      email,
      "Admin Login",
      `Hello ${adminUser.username}, you have logged in successfully!`
    );

    res.json({ message: "Login successful", token });
  } catch (error) {
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
