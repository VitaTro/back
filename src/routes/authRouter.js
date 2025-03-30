const express = require("express");
const router = express.Router();
const authUser = require("../controllers/authController");
const { check, validationResult } = require("express-validator");
const authMiddleware = require("../middleware/userMiddleware");
const { checkAdminMiddleware } = require("../middleware/checkAdminMiddleware");
router.get("/check-admin", authUser.checkFirstAdmin, (req, res) => {
  const isAdminAllowed = req.isFirstAdmin;
  if (!isAdminAllowed) {
    return res
      .status(403)
      .json({ message: "Адміністратор уже існує, реєстрація заблокована." });
  }
  res
    .status(200)
    .json({ message: "Можна зареєструвати першого адміністратора!" });
});

router.post("/register/admin", checkAdminMiddleware, authUser.registerAdmin);
router.post("/register", authUser.registerUser);
router.post("/login", authUser.loginUser);

router.post("/logout", authUser.logoutUser);
router.post("/protected-route", authMiddleware, (req, res) => {
  res.send("Це захищений ресурс.");
});

module.exports = router;
