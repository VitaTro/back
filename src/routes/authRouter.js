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

// Маршрут для перевірки статусу адміністратора
// router.get("/check-admin", async (req, res) => {
//   try {
//     const admins = await User.find({ role: "admin" });
//     const isFirstAdmin = admins.length === 0;
//     res.status(200).json({ isFirstAdmin });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to check admin status" });
//   }
// });

module.exports = router;
