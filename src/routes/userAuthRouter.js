const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../schemas/user");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { authenticateJWT } = require("../middleware/authenticateMiddleware");
const { refreshToken } = require("../middleware/refreshTokenMiddleware");
const { sendVerificationEmail } = require("../../emailService");
const { userValidationSchema } = require("../validation/userJoi");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

router.post("/register", async (req, res) => {
  try {
    // Валідація даних через Joi
    const { error } = userValidationSchema.validate(req.body);
    if (error)
      return res.status(400).json({ message: error.details[0].message });

    const { email, password, username } = req.body;

    // Перевірка унікальності email
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    // Хешування паролю
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, username, password: hashedPassword });

    // Надсилання email-підтвердження
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
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Якщо ти зберігаєш refreshToken у базі:
    user.refreshToken = refreshToken;
    await user.save();

    res.json({ accessToken, refreshToken });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Login error", error });
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

    // Видалення refresh-токена з бази
    user.refreshToken = null;
    await user.save();

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({ message: "Logout error", error });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Генеруємо унікальний токен для скидання паролю
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = resetToken;
    await user.save();

    const resetLink = `https://nika-gold-back-fe0ff35469d7.herokuapp.com/api/user/auth/reset-password?token=${resetToken}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset",
      text: `Click here to reset your password: ${resetLink}`,
    });

    res.json({ message: "Password reset link sent" });
  } catch (error) {
    res.status(500).json({ message: "Error sending reset email", error });
  }
});

router.post("/update-password", authenticateJWT, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
      return res.status(401).json({ message: "Incorrect old password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating password", error });
  }
});

module.exports = router;
