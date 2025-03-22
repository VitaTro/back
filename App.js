const express = require("express");
const cors = require("cors");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");
const upload = require("./src/middleware/uploadMiddleware");
const { cloudinary, storage } = require("./src/config/cloudinary");
const ProductRouter = require("./src/routes/productRouter");
const AuthRouter = require("./src/routes/authRouter");
const UserRouter = require("./src/routes/userRouter");
const app = express();
app.use(cors({ origin: "https://nika-gold.netlify.app" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Зробити папку з файлами доступною

app.use(
  "/favicon.ico",
  express.static(path.join(__dirname, "public", "favicon.ico"))
);

app.get("/", (req, res) => {
  res.send("Welcome to the API");
});

app.get("/test", (req, res) => {
  res.send("This is a test route");
});

// Routes
app.use("/api/products", ProductRouter);
app.use("/api/auth", AuthRouter);
app.use("/api/user", UserRouter);
app.get("/api/test", (req, res) => {
  res.json({ message: "This is a test route", success: true });
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Маршрут для завантаження зображень
app.post("/upload", upload.single("photo"), (req, res) => {
  cloudinary.uploader.upload(req.file.path, (error, result) => {
    if (error) {
      res.status(500).json({ error: "Failed to upload image" });
    } else {
      res.json({ url: result.secure_url });
    }
  });
});

module.exports = app;
