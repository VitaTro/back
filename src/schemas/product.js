const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    subcategory: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    purchasePrice: {
      type: Number,
      required: false, // Закупівельна ціна
    },
    description: {
      type: String,
      required: true,
    },
    photoUrl: {
      type: String,
      required: true,
    },
    size: {
      type: String, // Залишаємо для старих типів розмірів
      required: true,
    },
    width: {
      type: Number, // ширина в мм
      required: false,
    },
    length: {
      type: Number, // довжина в см
      required: false,
    },
    color: {
      type: String, // кольори, наприклад "red", "white", "green"
      required: false,
    },
    quantity: {
      type: Number, // Кількість товару в наявності
      required: true,
      default: 0,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    visible: {
      type: Boolean,
      default: true,
    },
    index: {
      type: String, // Може використовуватись для категоризації чи позиції
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    rating: {
      type: Number,
      default: 0,
      description: "Середній рейтинг продукту",
    },
    discount: {
      type: Number,
      default: 0,
      description: "Знижка на продукт (у відсотках)",
    },
    popularity: {
      type: Number,
      default: 0,
      description: "Популярність продукту",
    },
  },
  { collection: "products" }
);
productSchema.pre("save", function (next) {
  if (this.quantity <= 0) {
    this.inStock = false;
  } else {
    this.inStock = true;
  }
  next();
});

// Індекс для пошуку по тексту
productSchema.index({ name: "text", description: "text" });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
