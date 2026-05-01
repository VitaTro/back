const express = require("express");
const Product = require("../schemas/product");
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
router.post("/contact-email", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Wszystkie pola są wymagane" });
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `📩 Wiadomość ze strony – kontakt publiczny`,
      text: `Od: ${name}\nEmail: ${email}\n\n${message}`,
    });

    res.status(201).json({ message: "Wiadomość została wysłana!" });
  } catch (error) {
    console.error("🔥 Błąd wysyłki wiadomości:", error);
    res.status(500).json({ error: "Nie udało się wysłać wiadomości." });
  }
});

router.get("/popular-products", async (req, res) => {
  try {
    const popularItems = await Product.find()
      .sort({ popularity: -1 })
      .limit(100)
      .select("name popularity photoUrl index price");

    res.status(200).json(popularItems);
  } catch (error) {
    console.error("🔥 Error fetching popular products:", error);
    res.status(500).json({ error: "Failed to fetch popular products" });
  }
});
module.exports = router;
