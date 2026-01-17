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
const {
  googleAuthController,
  facebookAuthController,
} = require("../../controller/user/socialAuthController");
const { userValidationSchema } = require("../../validation/userJoi");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

router.post("/register", async (req, res) => {
  try {
    const { error } = userValidationSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { email, password, confirmPassword, username } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

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
          process.env.JWT_REFRESH_SECRET,
        );
        const user = await User.findById(decoded.id);

        // 🔹 Якщо пароль був змінений, очищаємо refreshToken та примушуємо новий логін
        if (
          !user ||
          user.refreshToken !== refreshToken ||
          user.passwordChangedAt > decoded.iat
        ) {
          return res
            .status(403)
            .json({ message: "Session expired. Please log in again." });
        }

        // Генеруємо новий accessToken
        const accessToken = jwt.sign(
          { id: user._id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: "15m" },
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

    // 🔹 Використовуємо стандартний логін
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (!user.isVerified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    // 🔹 Очищаємо старий refreshToken після скидання пароля
    await User.findOneAndUpdate({ email }, { refreshToken: null });

    // Генеруємо нові токени
    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );
    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );
    user.refreshToken = newRefreshToken;
    user.passwordChangedAt = Date.now(); // 🔹 Фіксуємо час зміни пароля
    await user.save();

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
      isVerified: user.isVerified,
    });
  } catch (error) {
    res.status(500).json({ message: "Login error", error: error.message });
  }
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
    // console.log("Введений resetCode:", resetCode);
    // console.log("Збережений в базі:", user.resetToken);
    // console.log("Чи ще дійсний:", user.resetTokenExpires > Date.now());

    const resetCode = Math.floor(100000 + Math.random() * 900000);
    user.resetCode = resetCode;
    user.resetCodeExpires = Date.now() + 600000;
    await user.save();
    console.log("Введений resetCode:", resetCode);
    console.log("Збережений в базі:", user.resetToken);
    console.log("Чи ще дійсний:", user.resetTokenExpires > Date.now());
    await sendResetPasswordEmail(user, resetCode);

    res.json({ message: "Password reset code sent" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error sending reset code", error: error.message });
  }
});

router.post("/update-password", async (req, res) => {
  try {
    const { email, resetCode, newPassword, confirmNewPassword } = req.body;

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const user = await User.findOne({
      email,
      resetCode,
      resetCodeExpires: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired code" });

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findOneAndUpdate(
      { email },
      { password: newHashedPassword, resetCode: null, resetCodeExpires: null },
      { new: true },
    );

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
router.post("/google", googleAuthController);
router.post("/facebook", facebookAuthController);

module.exports = router;
