const express = require("express");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../../schemas/userSchema");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { authenticateJWT } = require("../../middleware/authenticateMiddleware");
const { refreshToken } = require("../../middleware/refreshTokenMiddleware");
const {
  sendVerificationEmail,
  sendResetPasswordEmail,
} = require("../../config/emailService");
const { userValidationSchema } = require("../../validation/userJoi");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

router.post("/register", async (req, res) => {
  try {
    const { error } = userValidationSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });
    const { email, password, username } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    await sendVerificationEmail(newUser);
    res
      .status(201)
      .json({ message: "Registration successful. Please verify your email." });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Error registering user", error });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, refreshToken } = req.body;

    // 🔹 Якщо refreshToken є, перевіряємо його замість логіну
    if (refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET
        );
        const user = await User.findById(decoded.id);
        if (!user || user.refreshToken !== refreshToken) {
          return res.status(403).json({ message: "Invalid refresh token" });
        }

        // Генеруємо новий accessToken
        const accessToken = jwt.sign(
          { id: user._id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: "15m" }
        );

        return res.json({
          accessToken,
          refreshToken,
          isVerified: user.isVerified,
        });
      } catch (error) {
        return res
          .status(403)
          .json({ message: "Refresh token expired or invalid" });
      }
    }

    // 🔹 Якщо refreshToken немає, використовуємо стандартний логін
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (!user.isVerified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    // Генеруємо нові токени
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      isVerified: user.isVerified,
    });
  } catch (error) {
    res.status(500).json({ message: "Login error", error: error.message });
  }
  // try {

  //   const { email, password } = req.body;
  //   const user = await User.findOne({ email });
  //   if (!user || !(await bcrypt.compare(password, user.password))) {
  //     return res.status(401).json({ message: "Invalid email or password" });
  //   }
  //   if (!user.isVerified) {
  //     return res.status(403).json({ message: "Email not verified" });
  //   }
  //   const accessToken = jwt.sign(
  //     { id: user._id, role: user.role },
  //     process.env.JWT_SECRET,
  //     { expiresIn: "15m" }
  //   );
  //   const refreshToken = jwt.sign(
  //     { id: user._id },
  //     process.env.JWT_REFRESH_SECRET,
  //     { expiresIn: "7d" }
  //   );
  //   user.refreshToken = refreshToken;
  //   await user.save();
  //   res.json({ accessToken, refreshToken, isVerified: user.isVerified });
  // } catch (error) {
  //   res.status(500).json({ message: "Login error", error: error.message });
  // }
});

router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ message: "No refresh token provided" });
    const user = await User.findOne({ refreshToken });
    if (!user)
      return res.status(403).json({ message: "Invalid refresh token" });
    user.refreshToken = null;
    await user.save();
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout error", error });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetTokenExpires = Date.now() + 600000;
    await user.save();
    const resetLink = `https://nika-gold-back-fe0ff35469d7.herokuapp.com/api/user/auth/reset-password?token=${resetToken}`;
    await sendResetPasswordEmail(user, resetLink);
    res.json({ message: "Password reset link sent" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error sending reset email", error: error.message });
  }
});

router.post("/update-password", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    const user = await User.findOne({
      resetToken,
      resetTokenExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null; // 🧹 Видаляємо токен після скидання
    user.resetTokenExpires = null;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating password", error: error.message });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    user.isVerified = true;
    await user.save();
    res.redirect("https://nika-gold.netlify.app/user/auth/login");
  } catch (error) {
    res.status(500).json({ message: "Error verifying email" });
  }
});
router.post("/refresh", refreshToken);

module.exports = router;
