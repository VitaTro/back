const isAdmin = async (req, res, next) => {
  try {
    console.log("🔍 Перевірка статусу адміністратора...");

    // Переконуємося, що у `req.user` є дані та роль "admin"
    if (!req.user || req.user.role !== "admin") {
      console.log("❌ Відмовлено: Користувач не є адміністратором");
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    console.log("✅ Доступ дозволено: Користувач - адмін");
    next();
  } catch (error) {
    console.error("🔥 Помилка перевірки адміністратора:", error);
    return res
      .status(500)
      .json({ message: "Server error during authentication" });
  }
};

module.exports = { isAdmin };
