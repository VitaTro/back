const express = require("express");
const {
  checkAdmin,
  registerAdmin,
  registerUser,
  loginUser,
} = require("../controller/userController");
const authenticateJWT = require("../middleware/authMiddleware");
const adminSecretKey = require("../../generateAdminKey");
const router = express.Router();

router.get("/check-admin", checkAdmin);
router.post("/register/admin", registerAdmin);
router.post("/register/user", registerUser);
router.post(
  "/login/admin",
  (req, res, next) => {
    req.isAdmin = true; // Помітити запит як адміністратора
    next();
  },
  loginUser
);

router.post(
  "/login/user",
  (req, res, next) => {
    req.isAdmin = false; // Помітити запит як звичайного користувача
    next();
  },
  loginUser
);
// Захищені маршрути (приклад)
router.get("/protected-route", authenticateJWT, (req, res) => {
  res.json({ message: "You have access!", user: req.user });
});
router.get("/dashboard", authenticateJWT, (req, res) => {
  res.json({ message: `Welcome, ${req.user.email}!` });
});
module.exports = router;
