const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/userMiddleware");
const {
  getUserProfile,
  updateUserProfile,
} = require("../controllers/userController");

router.get("/profile", authMiddleware, getUserProfile);

router.put("/profile", authMiddleware, updateUserProfile);

module.exports = router;
