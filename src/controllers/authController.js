const User = require("../schemas/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
exports.register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 8);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role,
    });

    await newUser.save();
    res.status(201).send(newUser);
  } catch (error) {
    res.status(400).send(error);
  }
};

// Логін користувача
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).send("User not found");
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).send("Invalid password");
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.status(200).send({ auth: true, token });
  } catch (error) {
    res.status(400).send(error);
  }
};

// Логаут користувача
exports.logout = (req, res) => {
  res.status(200).send({ auth: false, token: null });
};

// Реєстрація адміністратора (один раз)
exports.registerAdmin = async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      return res.status(403).send("Admin already exists");
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
