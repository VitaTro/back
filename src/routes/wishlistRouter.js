const express = require("express");
const Wishlist = require("../schemas/wishlist");
const router = express.Router();
const Product = require("../schemas/product");

router.get("/", async (req, res) => {
  try {
    // const userId = req.user._id;
    const wishlist = await Wishlist.find().populate("productId"); // Заповнюємо дані про продукт
    res.json({ wishlist });
  } catch (error) {
    console.error("Error fetching wishlist:", error.message);
    res.status(500).json({ error: "Failed to retrieve wishlist items" });
  }
});

router.post("/add", async (req, res) => {
  try {
    // const userId = req.user._id;
    const { productId, quantity } = req.body;

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
      name: product.name,
      photoUrl: product.photoUrl,
      color: product.color || "default",
      price: product.price,
      quantity: quantity || 1,
      inStock: product.inStock,
    });

    await newItem.save();
    console.log("New wishlist item added:", newItem); // Логування нового об'єкта
    res.json({ message: "Item added to wishlist", item: newItem });
  } catch (error) {
    console.error("Error adding item to wishlist:", error.message); // Логування помилки
    res.status(500).json({ error: "Failed to add item to wishlist" });
  }
});

router.delete("/remove/:id", async (req, res) => {
  try {
    // const userId = req.user._id; // Тимчасово закоментовано
    const itemId = req.params.id;
    console.log("Deleting item with ID:", itemId); // Логування ID

    const item = await Wishlist.findOneAndDelete({ _id: itemId }); // Без userId
    if (!item) {
      console.error("Item not found for deletion:", itemId);
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: `Item with ID ${itemId} removed from wishlist` });
  } catch (error) {
    console.error("Error removing from wishlist:", error.message); // Логування помилки
    res.status(500).json({ error: "Failed to remove item from wishlist" });
  }
});

module.exports = router;
