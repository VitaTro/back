const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = mongoose.models.User || require("../schemas/userSchema");
const Admin = mongoose.models.Admin || require("../schemas/adminSchema");

const extractToken = (req) => req.headers.authorization?.split(" ")[1];

const authenticateJWT = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔍 Token Payload:", decoded); // ✅ Лог для перевірки ролі

    req.user = decoded;

    if (req.user.role === "admin") {
      req.admin = await Admin.findById(req.user.id);
      console.log("🔑 Admin Found:", req.admin);
    } else {
      req.user = await User.findById(req.user.id);
    }

    if (!req.user && !req.admin) {
      return res.status(403).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    console.error("🔥 JWT Error:", error);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = { authenticateJWT };
