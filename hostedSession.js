const axios = require("axios");

async function createHostedSession() {
  const payload = {
    merchantAlias: process.env.ELAVON_MERCHANT_ALIAS,
    processorId: process.env.ELAVON_PROCESSOR_ID,
    amount: 2.13,
    currency: "PLN",
    orderId: "ORD-ABC123",
    customerEmail: "test@example.com",
    expiryDate: "2025-07-17",
    returnUrl: "https://nika-gold.net/success",
    cancelUrl: "https://nika-gold.net/cancel",
    failUrl: "https://nika-gold.net/fail",
  };

  try {
    const response = await axios.post(
      "https://api.eu.convergepay.com/hosted-payments/payment_sessions",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.ELAVON_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("🎟️ Session created:", response.data.sessionId);
    return response.data.sessionId;
  } catch (error) {
    console.error(
      "❌ Failed to create session:",
      error.response?.data || error.message
    );
  }
}
