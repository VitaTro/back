const express = require("express");
const cors = require("cors");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");
const upload = require("./src/middleware/uploadMiddleware");
const { cloudinary, storage } = require("./src/config/cloudinary");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Зробити папку доступною для статичних файлів

app.use(
  "/favicon.ico",
  express.static(path.join(__dirname, "public", "favicon.ico"))
);

// Основний маршрут
app.get("/", (req, res) => {
  res.send("Welcome to the API");
});

app.get("/test", (req, res) => {
  res.send("This is a test route");
});

// Swagger документація
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
