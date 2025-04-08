const express = require("express");
const router = express.Router();
const {
  registerAdmin,
  registerUser,
  loginUser,
  logoutUser,
  resetPassword,
  updatePassword,
  refreshToken,
} = require("../controller/authController");
router.post("/register/admin", registerAdmin);
router.post("/register/user", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/reset-password", resetPassword); // Скидання пароля
router.post("/update-password", updatePassword); // Оновлення пароля
router.post("/refresh-token", refreshToken); // Оновлення токена
module.exports = router;
