const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../schemas/user");
const authService = require("../services/authService");
const { registerSchema, loginSchema } = require("../validation/validationJoi");
const bcrypt = require("bcryptjs");

const generateToken = (user) => {
  const payload = { id: user._id, role: user.role };
  return jwt.sign(payload, process.env.SECRET, { expiresIn: "1h" });
};

// Перевірка першого адміністратора
exports.checkFirstAdmin = async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: "admin" });
    res.status(200).json({ isFirstAdmin: adminCount === 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Реєстрація користувача
exports.registerUser = async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { name, email, password } = req.body;

  try {
    const existingUser = await authService.checkEmailAddress(email);
    if (existingUser) {
      return res.status(409).json({ message: "Email in use" });
    }

    const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(6));
    const newUser = new User({
      username: name,
      email,
      password: hashedPassword,
      role: "user",
    });

    await newUser.save();

    const token = generateToken(newUser);

    res.status(201).json({
      token,
      user: {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Логін користувача
exports.loginUser = async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { email, password } = req.body;

  try {
    const user = await authService.checkEmailAddress(email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user);

    res.status(200).json({
      token,
      user: { username: user.username, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Логаут користувача
exports.logoutUser = async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.jwtToken = null;
    await user.save();
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Реєстрація адміністратора (один раз)
exports.registerAdmin = async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount > 0) {
      return res.status(403).json({ message: "Admin already exists" });
    }

    const { username, email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);

    const newAdmin = new User({
      username,
      email,
      password: hashedPassword,
      role: "admin",
    });

    await newAdmin.save();
    res.status(201).send(newAdmin);
  } catch (error) {
    res.status(400).send(error);
  }
};
