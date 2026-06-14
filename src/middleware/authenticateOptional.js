const jwt = require("jsonwebtoken");
const User = require("../schemas/userSchema");

const authenticateOptional = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return next();

  const token = authHeader.split(" ")[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user) req.user = user;
  } catch (err) {
    // ігноруємо помилки — просто пропускаємо
  }

  next();
};

module.exports = authenticateOptional;
