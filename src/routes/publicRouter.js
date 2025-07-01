const express = require("express");
const router = express.Router();

router.post("/data-request-email", async (req, res) => {
  try {
    const { name, email, reason, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Wszystkie pola są wymagane" });
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `🗂️ Data request: ${reason}`,
      text: `Od: ${name}\nEmail: ${email}\n\n${message}`,
    });

    res.status(201).json({ message: "Zapytanie zostało wysłane!" });
  } catch (error) {
    console.error("🔥 Błąd wysyłki wiadomości:", error);
    res.status(500).json({ error: "Nie udało się wysłać zapytania." });
  }
});
module.exports = router;
