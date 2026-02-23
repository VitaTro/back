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
      required: false,
    },
    purchasePrice: {
      value: {
        type: Number,
        required: false, // або false, якщо буває, що нема закупки
      },
      currency: {
        type: String,
        enum: ["PLN", "USD", "EUR"],
        required: false,
      },
      exchangeRateToPLN: {
        type: Number,
        required: function () {
          return this.currency !== "PLN";
        }, // потрібно лише для валют ≠ PLN
      },
    },
    currentStock: {
      type: Number,
      default: 0,
    },
    lastRetailPrice: {
      type: Number,
      default: null,
    },

    description: {
      type: String,
      required: true,
    },
    photoUrl: {
      type: String,
      required: true,
    },
    additionalPhotos: {
      type: [String],
      default: [],
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
      required: false,
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
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    materials: {
      type: String,
      required: false,
      description: "Склад виробу: бісер, нитка, камені тощо",
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
  { collection: "products" },
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
productSchema.virtual("purchasePricePLN").get(function () {
  if (this.purchasePrice.currency === "PLN") return this.purchasePrice.value;
  return this.purchasePrice.value * this.purchasePrice.exchangeRateToPLN;
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
