exports.checkAdminMiddleware = async (req, res, next) => {
  try {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount > 0) {
      return res.status(403).json({ message: "Адміністратор уже існує." });
    }
    req.isFirstAdmin = true; // маркер для перевірки
    next();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
