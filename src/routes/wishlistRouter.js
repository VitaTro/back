const express = require("express");
const Wishlist = require("../schemas/wishlist");
const router = express.Router();
const Product = require("../schemas/product");

router.get("/", async (req, res) => {
  try {
    const wishlist = await Wishlist.find().populate("productId");
    const sanitizedWishlist = wishlist.filter((item) => item.productId); // Видаляємо записи без продуктів
    res.json({ wishlist: sanitizedWishlist });
  } catch (error) {
    console.error("Error fetching wishlist:", error.message);
    res.status(500).json({ error: "Failed to retrieve wishlist items" });
  }
});

router.post("/add", async (req, res) => {
  try {
    // const userId = req.user._id;
    const { productId } = req.body;

    console.log("Request body:", req.body); // Логування запиту

    const product = await Product.findById(productId);
    if (!product) {
      console.error("Product not found:", productId);
      return res.status(404).json({ error: "Product not found" });
    }

    // Перевіряємо, чи товар уже є в списку бажань
    const exists = await Wishlist.findOne({ productId });
    if (exists) {
      console.log("Product already in wishlist:", productId);
      return res.status(400).json({ error: "Product is already in wishlist" });
    }

    // Додаємо товар у список бажань
    const newItem = new Wishlist({
      productId,
      addedAt: new Date(),
    });

    await newItem.save();
    console.log("New wishlist item added:", newItem); // Логування нового об'єкта
    res.json({ message: "Item added to wishlist", item: newItem });
  } catch (error) {
    console.error("Error adding item to wishlist:", error.message); // Логування помилки
    res.status(500).json({ error: "Failed to add item to wishlist" });
  }
});

router.delete("/remove/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const item = await Wishlist.findOneAndDelete({ productId });
    if (!item) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ message: `Product with ID ${productId} removed from wishlist` });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to remove item from wishlist" });
  }
});

module.exports = router;
