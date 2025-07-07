const express = require("express");
const router = express.Router();
const axios = require("axios");
require("dotenv").config();

router.post("/", async (req, res) => {
  const { amount, currency, orderId, email, expiryDate } = req.body;
  try {
    const payload = {
      merchantAlias: process.env.ELAVON_MERCHANT_ALIAS,
      processorId: process.env.ELAVON_PROCESSOR_ID,
      amount: amount,
      currency: currency || "PLN",
      orderId: orderId,
      customerEmail: email,
      expiryDate: expiryDate, // Format: YYYY-MM-DD
      returnUrl: "https://nika-gold.net/success",
      cancelUrl: "https://nika-gold.net/cancel",
      failUrl: "https://nika-gold.net/fail",
    };
    const response = await axios.post(
      "https://api.converge.eu.elavon.com/hosted-payments/transaction_setup",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.ELAVON_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { redirectUrl } = response.data;
    return res.status(200).json({ payLink: redirectUrl });
  } catch (error) {
    console.error("Paylink error:", error.response?.data || error.message);
    res.status(500).json({ error: "Не вдалося створити лінк оплати" });
  }
});
module.exports = router;
