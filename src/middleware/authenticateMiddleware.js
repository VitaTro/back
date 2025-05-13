const jwt = require("jsonwebtoken");

const extractToken = (req) => req.headers.authorization?.split(" ")[1];

const authenticateJWT = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    console.error("JWT Error:", error);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = { authenticateJWT };
