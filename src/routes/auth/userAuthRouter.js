const express = require("express");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../../schemas/userSchema");
const jwt = require("jsonwebtoken");
const router = express.Router();
// const { authenticateJWT } = require("../../middleware/authenticateMiddleware");
const { authenticateUser } = require("../../middleware/authenticateUser");
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

    const hashedPassword = await bcrypt.hash(password, 8);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      providers: { local: true },
    });
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

    // 1️⃣ LOGOWANIE PRZEZ REFRESH TOKEN

    if (refreshToken) {
      try {
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET,
        );
        const user = await User.findById(decoded.id);
        if (
          !user ||
          user.refreshToken !== refreshToken ||
          user.passwordChangedAt > decoded.iat
        ) {
          return res
            .status(403)
            .json({ message: "Sesja wygasła. Zaloguj się ponownie." });
        }
        const newAccessToken = jwt.sign(
          { id: user._id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: "15m" },
        );
        // return res.json({
        //   accessToken: newAccessToken,
        //   refreshToken,
        //   isVerified: user.isVerified,
        // });
        res.cookie("userToken", newAccessToken, {
          httpOnly: true,
          secure: false,
          sameSite: "lax",
          // secure: process.env.NODE_ENV === "production",
          // sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          maxAge: 1000 * 60 * 60 * 24 * 30, // 30 днів
          path: "/",
        });

        return res.json({
          message: "Login successful",
          isVerified: user.isVerified,
        });
      } catch (error) {
        return res
          .status(403)
          .json({ message: "Refresh token wygasł lub jest nieprawidłowy." });
      }
    }

    // 2️⃣ STANDARDOWE LOGOWANIE (EMAIL + HASŁO)

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ message: "Nieprawidłowy e-mail lub hasło." });
    }
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Adres e-mail nie został jeszcze zweryfikowany." });
    }

    // Jeśli użytkownik loguje się lokalnie po raz pierwszy → dodajemy provider
    if (!user.providers.local) {
      user.providers.local = true;
      await user.save();
    }

    // Czyścimy stary refreshToken (np. po zmianie hasła)
    await User.findOneAndUpdate({ email }, { refreshToken: null });

    // 3️⃣ GENEROWANIE NOWYCH TOKENÓW

    const accessToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );
    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "365d" },
    );
    user.refreshToken = newRefreshToken;
    user.passwordChangedAt = Date.now();
    await user.save();
    res.cookie("userToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      // secure: process.env.NODE_ENV === "production",
      // sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30,
      path: "/",
    });
    return res.json({
      accessToken,
      refreshToken: newRefreshToken,
      isVerified: user.isVerified,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Błąd logowania.", error: error.message });
  }
});
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // 🔹 1. Чистимо cookie — це треба зробити ПЕРШИМ
    res.clearCookie("userToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    // 🔹 2. Якщо немає refreshToken → просто виходимо
    // (бо соцлогіни можуть не мати refreshToken)
    if (!refreshToken) {
      return res.json({ message: "Logged out successfully" });
    }

    // 🔹 3. Якщо refreshToken є — чистимо його в базі
    const user = await User.findOne({ refreshToken });
    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout error", error });
  }
});

// router.post("/logout", async (req, res) => {
//   try {
//     const { refreshToken } = req.body;
//     if (!refreshToken)
//       return res.status(400).json({ message: "No refresh token provided" });
//     const user = await User.findOne({ refreshToken });
//     res.clearCookie("userToken", {
//   httpOnly: true,
//   secure: true,
//   sameSite: "none",
// });

//     if (!user)
//       return res.status(403).json({ message: "Invalid refresh token" });
//     user.refreshToken = null;
//     await user.save();
//     res.json({ message: "Logged out successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Logout error", error });
//   }
// });

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
    res.redirect("https://nika-gold.net/user/auth/login");
  } catch (error) {
    res.status(500).json({ message: "Error verifying email" });
  }
});
router.get("/check", async (req, res) => {
  try {
    const token = req.cookies.userToken;
    if (!token) return res.json({ isUser: false, user: null });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) return res.json({ isUser: false, user: null });

    const user = await User.findById(decoded.id).select(
      "_id email username role",
    );
    if (!user) return res.json({ isUser: false, user: null });

    return res.json({
      isUser: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    return res.json({ isUser: false, user: null });
  }
});

router.post("/refresh", refreshToken);
router.post("/google", googleAuthController);
router.post("/facebook", facebookAuthController);

module.exports = router;
