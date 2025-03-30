const express = require("express");
const router = express.Router();
const {
  checkFirstAdmin,
  login,
  logout,
  register,
  registerAdmin,
} = require("../controllers/authController");
const { check, validationResult } = require("express-validator");
const authMiddleware = require("../middleware/userMiddleware");
router.get("/check-admin", checkFirstAdmin);
router.post(
  "/register/user",
  [
    check("email", "Введіть коректний email").isEmail(),
    check("password", "Пароль має бути щонайменше 6 символів").isLength({
      min: 6,
    }),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    req.body.role = "user";
    register(req, res, next);
  }
);

router.post("/register/admin", (req, res, next) => {
  req.body.role = "admin";
  register(req, res, next);
});
router.post("/register/admin", registerAdmin);

router.post("/login", login);

router.post("/logout", logout);
router.post("/protected-route", authMiddleware, (req, res) => {
  res.send("Це захищений ресурс.");
});

module.exports = router;
