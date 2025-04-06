require("dotenv").config();
const User = require("../schemas/user");
const userValidationSchema = require("../validation/userJoi");
const bcrypt = require("bcrypt");
// перевірка, чи є перший адмін
const checkAdmin = async (req, res) => {
  try {
    const admins = await User.find({
      role: "admin",
    });
    const isFirstAdmin = admins.length === 0;
    res.json({ isFirstAdmin });
  } catch (error) {
    res.status(500).json({ error: "Failed to check admin status." });
  }
};

// реєстрація адміна
const registerAdmin = async (req, res) => {
  const { error } = userValidationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const { username, email, password, adminSecret } = req.body;

    console.log("Received adminSecret:", adminSecret);
    console.log("Expected Admin Key:", process.env.ADMIN_SECRET_KEY);
    // Перевірка, чи є адміністратор
    const admins = await User.find({ role: "admin" });
    if (admins.length === 0) {
      if (!adminSecret) {
        return res.status(400).json({
          message: "Admin secret is required for the first admin.",
        });
      }

      if (adminSecret !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).send("Access Denied! Invalid Admin Key.");
      }

      // Створюємо першого адміністратора
      const newAdmin = new User({
        username,
        email,
        role: "admin",
      });
      newAdmin.setPassword(password);

      await newAdmin.save();
      return res
        .status(201)
        .json({ message: "First admin registered successfully!" });
    }

    // Якщо адміністратор уже існує
    return res.status(400).json({ message: "Admin already exists." });
  } catch (error) {
    res.status(500).json({
      error: "Failed to register admin.",
      details: error.message,
    });
  }
};

// реєстрація звичайного користувача
const registerUser = async (req, res) => {
  const { error } = userValidationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const { username, email, password } = req.body;
    const newUser = new User({ username, email });
    newUser.setPassword(password);
    await newUser.save();

    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to register user." });
  }
};

module.exports = { checkAdmin, registerAdmin, registerUser };
