const express = require("express");
const cors = require("cors");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");
const { cloudinary, storage, upload } = require("./src/config/cloudinary");
const ProductRouter = require("./src/routes/productRouter");
const AuthRouter = require("./src/routes/userRouter");
const ShoppingCartRouter = require("./src/routes/shoppingCartRouter");
const WishlistRouter = require("./src/routes/wishlistRouter");
const SearchRouter = require("./src/routes/searchRouter");
const FilterRouter = require("./src/routes/filterRouter");

const app = express();

const allowedOrigins = [
  "https://nika-gold.netlify.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Зробити папку з файлами доступною
app.use(
  "/favicon.ico",
  express.static(path.join(__dirname, "public", "favicon.ico"))
);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the API. Please use frontend." });
});

app.get("/test", (req, res) => {
  res.send("This is a test route");
});

// Routes
app.use("/api/products", ProductRouter);
app.use("/api/auth", AuthRouter);
app.use("/api/user/shopping-cart", ShoppingCartRouter);
app.use("/api/wishlist", WishlistRouter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api", SearchRouter);
app.use("/api/products", FilterRouter);

app.post("/upload", upload.single("photo"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    cloudinary.uploader.upload(req.file.path, (error, result) => {
      if (error) {
        return res.status(500).json({ error: "Failed to upload image" });
      }
      res.json({ url: result.secure_url });
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "An unexpected error occurred", details: err.message });
  }
});

module.exports = app;
