const express = require("express");
const cors = require("cors");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");
const { cloudinary, storage, upload } = require("./src/config/cloudinary");
const { error } = require("console");
const ProductRouter = require("./src/routes/productRouter");
const app = express();
app.use(cors());
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

// Route
app.use("/api/products", ProductRouter);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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
