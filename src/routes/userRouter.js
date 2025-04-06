const express = require("express");
const {
  checkAdmin,
  registerAdmin,
  registerUser,
} = require("../controller/userController");
const router = express.Router();

router.get("/auth/check-admin", checkAdmin);
router.post("/auth/register/admin", registerAdmin);
router.post("/auth/register/user", registerUser);
module.exports = router;
