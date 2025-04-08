const express = require("express");
const {
  getUserProfile,
  getUserMainData,
  protectedRoute,
  updateAvatar,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  updatePreferences,
  getShoppingCart,
  addToShoppingCart,
  removeFromShoppingCart,
  getPurchaseHistory,
} = require("../controller/userController");
const {
  isAuthenticated,
  authenticateJWT,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Профіль користувача
router.get("/profile", isAuthenticated, getUserProfile);
router.get("/main", isAuthenticated, getUserMainData);
router.get("/protected-route", authenticateJWT, protectedRoute);

// Аватар
router.post("/avatar", isAuthenticated, updateAvatar);

// Список бажань (wishlist)
router.get("/wishlist", isAuthenticated, getWishlist);
router.post("/wishlist/add", isAuthenticated, addToWishlist);
router.delete("/wishlist/remove/:id", isAuthenticated, removeFromWishlist);

// Налаштування користувача (preferences)
router.post("/preferences", isAuthenticated, updatePreferences);

// Корзина покупок (shopping cart)
router.get("/shopping-cart", isAuthenticated, getShoppingCart);
router.post("/shopping-cart/add", isAuthenticated, addToShoppingCart);
router.delete(
  "/shopping-cart/remove/:id",
  isAuthenticated,
  removeFromShoppingCart
);

// Історія покупок (purchase history)
router.get("/purchase-history", isAuthenticated, getPurchaseHistory);

module.exports = router;
