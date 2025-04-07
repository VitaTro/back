const express = require("express");
const {
  checkAdmin,
  registerAdmin,
  registerUser,
  loginUser,
} = require("../controller/userController");
const {
  authenticateJWT,
  isAuthenticated,
} = require("../middleware/authMiddleware");
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
router.get("/main", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // Дані юзера
    const products = await Product.find(); // Наприклад, всі продукти для юзера
    res.status(200).json({
      message: "Welcome to the main page",
      user: {
        id: user._id,
        name: user.username,
        role: user.role,
      },
      preferences: user.preferences,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to load user data" });
  }
});

// Захищені маршрути (приклад)
router.get("/protected-route", authenticateJWT, (req, res) => {
  res.json({ message: "You have access!", user: req.user });
});

router.get("/dashboard", authenticateJWT, (req, res) => {
  console.log("Authenticated User:", req.user);
  if (req.user.role !== "admin") {
    console.log("Access denied. Role is:", req.user.role);
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  res.json({ message: `Welcome to the dashboard, ${req.user.email}!` });
});
module.exports = router;
