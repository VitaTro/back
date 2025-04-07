require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../schemas/user");
const {
  userValidationSchema,
  adminValidationSchema,
} = require("../validation/userJoi");

// Перевірка, чи є перший адмін
const checkAdmin = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" });
    const isFirstAdmin = admins.length === 0;
    res.json({ isFirstAdmin });
  } catch (error) {
    res.status(500).json({ error: "Failed to check admin status." });
  }
};

// Генерація JWT
const generateJWT = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// Реєстрація адміністратора
const registerAdmin = async (req, res) => {
  const { error } = adminValidationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const { username, email, password, adminSecret } = req.body;

    // Перевірка ключа адміністратора
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ message: "Invalid Admin Secret Key" });
    }

    // Створення адміністратора
    const newAdmin = new User({
      username,
      email,
      role: "admin",
    });
    newAdmin.setPassword(password);
    await newAdmin.save();

    res.status(201).json({ message: "Admin registered successfully!" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to register admin.", details: error.message });
  }
};

// Реєстрація користувача
const registerUser = async (req, res) => {
  const { error } = userValidationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

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

// Логін користувача або адміністратора
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const isAdmin = req.isAdmin; // Визначення ролі

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = user.validPassword(password);
    if (!isPasswordValid) {
      return res.status(403).json({ message: "Invalid password" });
    }

    // Перевірка ролі
    if (isAdmin && user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized as admin" });
    }

    const token = generateJWT(user); // Генерація токена
    const route = user.role === "admin" ? "/admin/dashboard" : "/main"; // Визначення маршруту

    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.username,
        email: user.email,
        role: user.role,
        photo: user.photo || "",
      },
      redirectTo: route, // Маршрут для перенаправлення
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

// Експорт функцій
module.exports = { checkAdmin, registerAdmin, registerUser, loginUser };
