const express = require("express");
const cors = require("cors");
const path = require("path");
// const swaggerUi = require("swagger-ui-express");
// const swaggerDocument = require("./swagger-resolved.json");
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

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(null, {
    swaggerOptions: {
      url: "https://app.swaggerhub.com/apis/VITYLJATROJAN/nika_gold/2.0.0", // URL до вашої документації
    },
    explorer: true, // Дозволяє розширений режим
  })
);

module.exports = app;
