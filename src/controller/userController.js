const User = require("../schemas/user");
const getUserMainData = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // Витягуємо профіль без пароля
    const products = await Product.find(); // Отримання продуктів (можна додати фільтрацію)

    res.status(200).json({
      message: "Welcome to the main page",
      user: {
        id: user._id,
        name: user.username,
        role: user.role,
        preferences: user.preferences || [],
      },
      products, // Відправляємо продукти
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Failed to load main user data.",
        error: error.message,
      });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user profile." });
  }
};
const updateAvatar = async (req, res) => {
  const { avatarUrl } = req.body;
  try {
    const user = await User.findById(req.user.id);
    user.avatar = avatarUrl;
    await user.save();
    res.json({ message: "Avatar updated successfully!", avatar: user.avatar });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update avatar.", error: error.message });
  }
};
const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("wishlist");
    res.json({ wishlist: user.wishlist });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to retrieve wishlist.", error: error.message });
  }
};

const addToWishlist = async (req, res) => {
  const { productId } = req.body;
  try {
    const user = await User.findById(req.user.id);
    user.wishlist.push(productId);
    await user.save();
    res.json({
      message: "Product added to wishlist!",
      wishlist: user.wishlist,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add product to wishlist.",
      error: error.message,
    });
  }
};

const removeFromWishlist = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(req.user.id);
    user.wishlist = user.wishlist.filter(
      (productId) => productId.toString() !== id
    );
    await user.save();
    res.json({
      message: "Product removed from wishlist!",
      wishlist: user.wishlist,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove product from wishlist.",
      error: error.message,
    });
  }
};
const updatePreferences = async (req, res) => {
  const { preferences } = req.body;
  try {
    const user = await User.findById(req.user.id);
    user.preferences = preferences;
    await user.save();
    res.json({
      message: "Preferences updated successfully!",
      preferences: user.preferences,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update preferences.", error: error.message });
  }
};
const getShoppingCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("shoppingCart");
    res.json({ shoppingCart: user.shoppingCart });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve shopping cart.",
      error: error.message,
    });
  }
};

const addToShoppingCart = async (req, res) => {
  const { productId } = req.body;
  try {
    const user = await User.findById(req.user.id);
    user.shoppingCart.push(productId);
    await user.save();
    res.json({
      message: "Product added to shopping cart!",
      shoppingCart: user.shoppingCart,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add product to shopping cart.",
      error: error.message,
    });
  }
};

const removeFromShoppingCart = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(req.user.id);
    user.shoppingCart = user.shoppingCart.filter(
      (productId) => productId.toString() !== id
    );
    await user.save();
    res.json({
      message: "Product removed from shopping cart!",
      shoppingCart: user.shoppingCart,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove product from shopping cart.",
      error: error.message,
    });
  }
};
const getPurchaseHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("purchaseHistory");
    res.json({ purchaseHistory: user.purchaseHistory });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve purchase history.",
      error: error.message,
    });
  }
};
const protectedRoute = (req, res) => {
  try {
    res.json({
      message: "You have access!",
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Access failed.", error: error.message });
  }
};

module.exports = {
  getUserProfile,
  updateAvatar,
  getWishlist,
  updatePreferences,
  getShoppingCart,
  addToShoppingCart,
  removeFromShoppingCart,
  getPurchaseHistory,
  removeFromWishlist,
  addToWishlist,
  getUserMainData,
  protectedRoute,
};
