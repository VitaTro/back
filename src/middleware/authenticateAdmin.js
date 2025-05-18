const jwt = require("jsonwebtoken");

const extractToken = (req) => req.headers.authorization?.split(" ")[1];

const authenticateAdmin = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔍 Token Decoded:", decoded);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Not an admin" });
    }

    req.admin = decoded; // Використовуємо дані з токена, а не шукаємо в базі
    next();
  } catch (error) {
    console.error("🔥 JWT Error:", error);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = { authenticateAdmin };
