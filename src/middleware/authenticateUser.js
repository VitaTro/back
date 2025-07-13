const jwt = require("jsonwebtoken");
const User = require("../schemas/userSchema"); // Підключаємо User модель

const extractToken = (req) => req.headers.authorization?.split(" ")[1];

const authenticateUser = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔍 Token Decoded:", decoded);

    req.user = decoded;
    return next(); // ✅ Якщо токен діючий, переходимо далі
  } catch (error) {
    console.error("🔥 JWT Error:", error);

    // 🛠 Якщо токен закінчився — перевіряємо refreshToken
    if (error.name === "TokenExpiredError") {
      const refreshToken = req.headers["x-refresh-token"]; // Отримуємо refresh токен
      if (!refreshToken) {
        return res
          .status(403)
          .json({ message: "Session expired, please log in again" });
      }

      try {
        const decodedRefresh = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET
        );
        const user = await User.findById(decodedRefresh.id);

        if (!user || user.refreshToken !== refreshToken) {
          return res.status(403).json({ message: "Invalid refresh token" });
        }

        // ✅ Генеруємо новий accessToken
        const newAccessToken = jwt.sign(
          {
            id: user.id,
            username: user.username,
            role: user.role,
            email: user.email,
          },
          process.env.JWT_SECRET,
          { expiresIn: "30d" }
        );
        const refreshToken = jwt.sign(
          { id: user.id },
          process.env.JWT_REFRESH_SECRET,
          { expiresIn: "90d" } // 🔹 Запасний варіант на 3 місяці
        );
        req.user = decodedRefresh; // ✅ Оновлюємо користувача
        res.setHeader("x-access-token", newAccessToken); // Надсилаємо новий токен у заголовку
        return next(); // ✅ Продовжуємо запит після оновлення токена
      } catch (refreshError) {
        return res
          .status(403)
          .json({ message: "Invalid or expired refresh token" });
      }
    }

    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = { authenticateUser };
