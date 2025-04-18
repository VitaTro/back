const express = require("express");
const wishlistRouter = express.Router();

// Get all wishlist items
wishlistRouter.get("/", async (req, res) => {
  try {
    const wishlist = await WishlistModel.find(); // Отримання з MongoDB
    res.json({ wishlist });
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve wishlist items" });
  }
});

wishlistRouter.post("/add", async (req, res) => {
  try {
    const newItem = new WishlistModel(req.body); // Створення нового елемента
    await newItem.save(); // Збереження в базу даних
    res.json({ message: "Item added to wishlist", item: newItem, wishlist });
  } catch (error) {
    res.status(500).json({ error: "Failed to add item to wishlist" });
  }
});

wishlistRouter.delete("/remove/:id", async (req, res) => {
  try {
    const itemId = req.params.id;
    await WishlistModel.findByIdAndDelete(itemId); // Видалення з бази
    const wishlist = await WishlistModel.find();
    res.json({ message: `Item with ID ${itemId} removed from wishlist` });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove item from wishlist" });
  }
});

module.exports = wishlistRouter;
