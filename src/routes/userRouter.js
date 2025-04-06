const express = require("express");
const {
  checkAdmin,
  registerAdmin,
  registerUser,
} = require("../controller/userController");
const router = express.Router();

router.get("/check-admin", checkAdmin);
router.post("/register/admin", registerAdmin);
router.post("/register/user", registerUser);
module.exports = router;
