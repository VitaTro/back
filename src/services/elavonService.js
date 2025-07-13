const axios = require("axios");
require("dotenv").config();
async function createPaylink({
  amount,
  currency = "PLN",
  orderId,
  email,
  expiryDate,
}) {
  try {
    const payload = {
      merchantAlias: process.env.ELAVON_MERCHANT_ALIAS,
      processorId: process.env.ELAVON_PROCESSOR_ID,
      amount,
      currency,
      orderId,
      customerEmail: email,
      expiryDate,
      returnUrl: "https://nika-gold.net/success",
      cancelUrl: "https://nika-gold.net/cancel",
      failUrl: "https://nika-gold.net/fail",
    };

    console.log("📦 Payload sent to Elavon:", payload);

    const response = await axios.post(
      "https://api.eu.convergepay.com/hosted-payments/payment_sessions",
      {
        ...payload,
        customerEmail: email || "anonim@nika-gold.net",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ELAVON_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paylink = response.data?.redirectUrl;
    if (!paylink) throw new Error("Elavon не повернув redirectUrl");

    return paylink;
  } catch (error) {
    console.error("❌ Paylink error:", error.response?.data || error.message);
    throw new Error("Не вдалося створити лінк оплати");
  }
}

module.exports = { createPaylink };
