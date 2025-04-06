const User = require("../schemas/user");
const userValidationSchema = require("../validation/userJoi");

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
    const admins = await User.find({ role: "admin" });
    if (admins.length === 0 && !adminSecret) {
      return res
        .status(400)
        .json({ message: "Admin secret is required for the first admin." });
    }
    const newAdmin = new User({
      username,
      email,
      role: "admin",
    });
    newAdmin.setPassword(password);
    newAdmin.adminSecret = adminSecret;
    await newAdmin.save();

    res.status(201).json({ message: "Admin registered successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to register admin." });
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
