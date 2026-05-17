const jwt = require("jsonwebtoken");

const authenticateAdmin = (req, res, next) => {
  try {
    const token = req.cookies.adminToken; // 🔥 беремо токен з cookies

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Not an admin" });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    console.error("🔥 Admin JWT Error:", error);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
module.exports = { authenticateAdmin };
