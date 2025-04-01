const express = require("express");
const cors = require("cors");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");
const upload = require("./src/middleware/uploadMiddleware");
const { cloudinary } = require("./src/config/cloudinary");
const ProductRouter = require("./src/routes/productRouter");
const AuthRouter = require("./src/routes/authRouter");
const UserRouter = require("./src/routes/userRouter");

const app = express();

// Дозволені походження
const allowedOrigins = [
  "https://nika-gold.netlify.app",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      console.log("CORS Origin:", origin); // Логування для діагностики
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true); // Дозволити запит
      } else {
        callback(new Error("Not allowed by CORS")); // Блокування
      }
    },
    credentials: true, // Дозвіл на передачу кукі
  })
);

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

// Основні маршрути
app.use("/api/products", ProductRouter);
app.use("/api/auth", AuthRouter);
app.use("/api/user", UserRouter);

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

// Обробка помилок CORS
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    res.status(403).json({ error: "CORS policy blocked the request" });
  } else {
    next();
  }
});

module.exports = app;
