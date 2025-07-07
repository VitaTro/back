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
const StockMovementRouter = require("./src/routes/accounting/stockMovementRouter");
const ReportingRouter = require("./src/routes/admin/reportingRouter");
const OnlineOrdersFinanceRouter = require("./src/routes/orders/onlineOrdersRouter");
const OnlineSalesFinanceRouter = require("./src/routes/sales/onlineSalesRouter");
const OfflineOrdersFinanceRouter = require("./src/routes/orders/offlineOrdersRouter");
const MonthlyReportRouter = require("./src/routes/accounting/monthlyReportRouter");
const OfflineSalesFinanceRouter = require("./src/routes/sales/offlineSalesRouter");
const FinanceOverviewRouter = require("./src/routes/finance/financeOverviewRouter");
const FinanceSettingsRouter = require("./src/routes/finance/financeSettingsRouter");
const AdminAuthRouter = require("./src/routes/auth/adminAuthRouter");
const UserAuthRouter = require("./src/routes/auth/userAuthRouter");
const ProfileRouter = require("./src/routes/user/profileRouter");
const PaymentRouter = require("./src/routes/paymentRouter");
const { authenticateUser } = require("./src/middleware/authenticateUser");
const MainRouter = require("./src/routes/mainRouter");
const InvoicesRouter = require("./src/routes/accounting/invoiceRouter");
const ExpenseRouter = require("./src/routes/finance/expenseRouter");
const PublicRouter = require("./src/routes/publicRouter");
const AllegroRouter = require("./src/routes/allegroRouter");
const PaylinkRouter = require("./src/routes/paylinkRouter");
const app = express();

const allowedOrigins = [
  "https://nika-gold.net",
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
      : "https://nika-gold.net"
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

app.get("/test", (req, res) => {
  res.send("This is a test route");
});

// Routes
app.use("/api", MainRouter);
app.use("/api/products", ProductRouter);
app.use("/api/user", ProfileRouter);
app.use("/api/user/orders", OrdersRouter);
app.use("/api/user/payments", PaymentRouter);
app.use("/api/user/invoices", InvoicesRouter);
app.use("/api/admin/auth", AdminAuthRouter);
app.use("/api/user/auth", UserAuthRouter);
app.use("/api/user/shopping-cart", ShoppingCartRouter);
app.use("/api/user/wishlist", WishlistRouter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api", SearchRouter);
app.use("/api/products", FilterRouter);
app.use("/api/admin", AdminRouter);
app.use("/api/admin/accounting/monthly-report", MonthlyReportRouter);
app.use("/api/admin/finance/online/orders", OnlineOrdersFinanceRouter);
app.use("/api/admin/finance/online/sales", OnlineSalesFinanceRouter);
app.use("/api/admin/finance/offline/orders", OfflineOrdersFinanceRouter);
app.use("/api/admin/finance/offline/sales", OfflineSalesFinanceRouter);
app.use("/api/admin/stock/movement", StockMovementRouter);
app.use("/api/admin/finance/overview", FinanceOverviewRouter);
app.use("/api/admin/finance/expense", ExpenseRouter);
app.use("/api/admin/finance/settings", FinanceSettingsRouter);
app.use("/api/public", PublicRouter);
app.use("/api/allegro", AllegroRouter);
app.use("/api/admin/reporting", ReportingRouter);
app.use("/api/paylink", PaylinkRouter);
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
