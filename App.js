const express = require("express");
const cors = require("cors");
const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");
const { cloudinary, storage, upload } = require("./src/config/cloudinary");
const ProductRouter = require("./src/routes/productRouter");
const OrdersRouter = require("./src/routes/user/ordersRouter");
const ShoppingCartRouter = require("./src/routes/user/shoppingCartRouter");
const WishlistRouter = require("./src/routes/user/wishlistRouter");
const SearchRouter = require("./src/routes/searchRouter");
const FilterRouter = require("./src/routes/filterRouter");
const AdminRouter = require("./src/routes/adminRouter");
const OnlineOrdersFinanceRouter = require("./src/routes/finance/onlineOrdersFinanceRouter");
const OnlineSalesFinanceRouter = require("./src/routes/finance/onlineSalesFinanceRouter");
const OfflineOrdersFinanceRouter = require("./src/routes/finance/offlineOrdersFinanceRouter");
const OfflineSalesFinanceRouter = require("./src/routes/finance/offlineSalesFinanceRouter");
const FinanceOverviewRouter = require("./src/routes/finance/financeOverviewRouter");
const FinanceSettingsRouter = require("./src/routes/finance/financeSettingsRouter");
const AdminAuthRouter = require("./src/routes/auth/adminAuthRouter");
const UserAuthRouter = require("./src/routes/auth/userAuthRouter");
const ProfileRouter = require("./src/routes/user/profileRouter");
const RecentRouter = require("./src/routes/user/recentRouter");
const { authenticateUser } = require("./src/middleware/authenticateUser");

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
app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    allowedOrigins.includes(req.headers.origin)
      ? req.headers.origin
      : "https://nika-gold.netlify.app"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Зробити папку з файлами доступною
app.use(
  "/favicon.ico",
  express.static(path.join(__dirname, "public", "favicon.ico"))
);

app.get("/main", authenticateUser, (req, res) => {
  if (req.user) {
    res.redirect("/api/user/main"); // 🔹 Перенаправлення для залогованих
  } else {
    res.json({ message: "Welcome! Log in to access full features." }); // 🔹 Повідомлення для гостей
  }
});
app.get("/test", (req, res) => {
  res.send("This is a test route");
});

// Routes
app.use("/api/products", ProductRouter);
app.use("/api/user/profile", ProfileRouter);
app.use("/api/user/orders", OrdersRouter);
app.use("/api/user/recent", RecentRouter);
app.use("/api/admin/auth", AdminAuthRouter);
app.use("/api/user/auth", UserAuthRouter);
app.use("/api/user/shopping-cart", ShoppingCartRouter);
app.use("/api/user/wishlist", WishlistRouter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api", SearchRouter);
app.use("/api/products", FilterRouter);
app.use("/api/admin", AdminRouter);
app.use("/api/admin/finance/online/orders", OnlineOrdersFinanceRouter);
app.use("/api/admin/finance/online/sales", OnlineSalesFinanceRouter);
app.use("/api/admin/finance/offline/orders", OfflineOrdersFinanceRouter);
app.use("/api/admin/finance/offline/sales", OfflineSalesFinanceRouter);
app.use("/api/admin/finance/overview", FinanceOverviewRouter);
app.use("/api/admin/finance/settings", FinanceSettingsRouter);
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
