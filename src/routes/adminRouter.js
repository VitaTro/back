const express = require("express");
const {
  checkAdmin,
  getDashboard,
  manageProducts,
  manageUsers,
} = require("../controller/adminController");
const { authenticateJWT } = require("../middleware/authMiddleware");
const router = express.Router();
router.get("/users", authenticateJWT, manageUsers);
router.delete("/users/:id", authenticateJWT, manageUsers);
router.post("/products", authenticateJWT, manageProducts);
router.patch("/products/:id", authenticateJWT, manageProducts);
router.delete("/products/:id", authenticateJWT, manageProducts);
router.get("/dashboard", authenticateJWT, getDashboard);
router.get("/check-admin", authenticateJWT, checkAdmin);

module.exports = router;
