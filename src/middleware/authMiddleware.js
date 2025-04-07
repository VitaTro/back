const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Додаємо дані користувача до req.user
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid token" });
  }
};
const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", ""); // Отримуємо токен із заголовків
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token provided. Access denied." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Розшифровуємо токен
    req.user = await User.findById(decoded.id).select("-password"); // Додаємо користувача до req

    if (!req.user) {
      return res.status(404).json({ message: "User not found." });
    }

    next(); // Продовжуємо роботу
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ message: "Invalid or expired token." });
  }
};
module.exports = { authenticateJWT, isAuthenticated };
