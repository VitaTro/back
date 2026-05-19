const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { sendEmail } = require("../../config/emailService");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = mongoose.models.Admin || require("../../schemas/adminSchema");
const { refreshToken } = require("../../middleware/refreshTokenMiddleware");

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
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ username, email, password: hashedPassword });

    await newAdmin.save();
    await sendEmail(
      email,
      "Welcome Admin!",
      `Hello ${username}, your admin account is now active!`,
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
    if (!admin) {
      return res.status(403).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(403).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, role: "admin", isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // 🔥 СТАВИМО COOKIE ЗАМІСТЬ JSON TOKEN
    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",

      maxAge: 1000 * 60 * 60 * 24 * 30,
      path: "/",
    });

    return res.json({ message: "Login successful" });
  } catch (error) {
    console.error("🔥 Login error:", error);
    res.status(500).json({ error: "Login failed", details: error.message });
  }
});

router.post("/refresh", refreshToken);

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

router.get("/check", async (req, res) => {
  try {
    const token = req.cookies.adminToken;
    if (!token) {
      return res.json({ isAdmin: false });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.isAdmin) {
      return res.json({ isAdmin: false });
    }

    return res.json({ isAdmin: true });
  } catch (error) {
    return res.json({ isAdmin: false });
  }
});

router.post("/logout", async (req, res) => {
  try {
    res.clearCookie("adminToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.json({ message: "Admin logged out successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Logout failed", details: error.message });
  }
});

module.exports = router;
