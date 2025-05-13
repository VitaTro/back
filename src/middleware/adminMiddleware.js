const User = require("../schemas/user");

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(403).json({ message: "Access denied: No user found" });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    next();
  } catch (error) {
    console.error("Admin Check Error:", error);
    return res
      .status(500)
      .json({ message: "Server error during authentication" });
  }
};

module.exports = { isAdmin };
