const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../schemas/user");
const {
  userValidationSchema,
  adminValidationSchema,
} = require("../validation/userJoi");

const generateJWT = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
};

const registerAdmin = async (req, res) => {
  const { error } = adminValidationSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const { username, email, password, adminSecret } = req.body;

    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ message: "Invalid Admin Secret Key" });
    }

    const newAdmin = new User({ username, email, role: "admin" });
    newAdmin.setPassword(password);
    await newAdmin.save();
    res.status(201).json({ message: "Admin registered successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to register admin.", details: error.message });
  }
};

const registerUser = async (req, res) => {
  const { error } = userValidationSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    const { username, email, password } = req.body;
    const newUser = new User({ username, email, role: "user" });
    newUser.setPassword(password);
    await newUser.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to register user." });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const isAdmin = req.isAdmin;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isPasswordValid = user.validPassword(password);
    if (!isPasswordValid)
      return res.status(403).json({ message: "Invalid password" });

    if (isAdmin && user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized as admin" });
    }

    const token = generateJWT(user);
    const route = user.role === "admin" ? "/admin/dashboard" : "/main";

    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.username,
        email: user.email,
        role: user.role,
      },
      redirectTo: route,
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

const logoutUser = (req, res) => {
  // Логіка для виходу з облікового запису
  res.json({ message: "Logout successful!" });
};

const resetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Генерація токена для скидання пароля
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Імітація надсилання електронного листа
    console.log(
      `Reset password link: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    );

    res.json({ message: "Password reset link sent to your email!" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to send password reset link.",
      error: error.message,
    });
  }
};
const updatePassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.setPassword(newPassword);
    await user.save();

    res.json({ message: "Password updated successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update password.", error: error.message });
  }
};
const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Перевірка, чи існує користувач
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Генерація нового токена доступу
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ accessToken });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to refresh token.", error: error.message });
  }
};

module.exports = {
  registerAdmin,
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  resetPassword,
  updatePassword,
};
