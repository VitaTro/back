const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { sendEmail } = require("../../emailService");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = mongoose.models.Admin || require("../schemas/adminSchema");

router.post("/register", async (req, res) => {
  const { username, email, password, adminSecret } = req.body;

  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: "Invalid Admin Secret Key" });
  }

  try {
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    // 🔐 **Хешуємо пароль і зберігаємо в `AdminSchema`**
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ username, email, password: hashedPassword });

    await newAdmin.save();
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
    const admin = await Admin.findOne({ email });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(403).json({ message: "Invalid credentials" });
    }

    // 🎟 Генеруємо токен
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    await sendEmail(
      email,
      "Admin Login",
      `Hello ${admin.username}, you have logged in successfully!`
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
    res.json({ message: "Admin logged out successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Logout failed", details: error.message });
  }
});

module.exports = router;
