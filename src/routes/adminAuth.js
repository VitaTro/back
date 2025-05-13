const express = require("express");
const router = express.Router();
const sendEmail = require("../../emailService");
const User = require("../schemas/user");

router.post("/register", async (req, res) => {
  const { username, email, password, adminSecret } = req.body;

  // 🔐 Перевірка секретного ключа для адміна
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ message: "Invalid Admin Secret Key" });
  }

  try {
    // 🛡️ Хешування пароля
    const hashedPassword = bcrypt.hashSync(password, 10);

    // 📌 Створення нового адміна
    const newAdmin = new User({
      username,
      email,
      password: hashedPassword,
      role: "admin",
    });
    await newAdmin.save();

    // ✉️ Надсилання email-підтвердження
    await sendEmail(
      email,
      "Адміністратор успішно зареєстрований!",
      `Вітаємо, ${username}! Ваш обліковий запис адміністратора створено успішно. Тепер ви можете увійти на платформу.`
    );

    res
      .status(201)
      .json({ message: "Admin registered successfully! Email sent." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Registration failed", details: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, role: "admin" });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(403).json({ message: "Invalid credentials" });
    }

    // 🎫 Генеруємо JWT-токен
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    // ✉️ Сповіщення про успішний логін
    await sendEmail(
      email,
      "Вхід адміністратора",
      `Вітаємо, ${user.username}! Ви успішно увійшли до адміністративної панелі.`
    );

    // 🔀 Перенаправлення після входу
    res.json({
      message: "Login successful",
      token,
      redirect: "/api/admin/dashboard",
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed", details: error.message });
  }
});
module.exports = router;
