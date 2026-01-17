const express = require("express");
const { authenticateUser } = require("../../middleware/authenticateUser");
const User = require("../../schemas/userSchema");
const router = express.Router();

router.post("/merge", authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const localCart = req.body.localCart || [];
    const user = await User.findById(userId);
    const merged = mergeCarts(user.cart, localCart);
    user.cart = merged;
    await user.save();

    res.json({ cart: merged });
  } catch (err) {
    res.status(500).json({ message: "Cart merge failed", error: err.message });
  }
});
function mergeCarts(serverCart, localCart) {
  const map = new Map();
  [...serverCart, ...localCart].forEach((item) => {
    if (map.has(item.productId)) {
      map.get(item.productId).quantity += item.quantity;
    } else {
      map.set(item.productId, { ...item });
    }
  });
  return [...map.values()];
}
module.exports = router;
