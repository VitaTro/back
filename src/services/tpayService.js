const axios = require("axios");

async function getTpayToken() {
  try {
    const response = await axios.post(
      "https://openapi.tpay.com/oauth/token",
      {
        grant_type: "client_credentials",
        client_id: process.env.TRAY_CLIENT_ID,
        client_secret: process.env.TRAY_CLIENT_SECRET,
      },
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    return response.data.access_token;
  } catch (error) {
    console.error("❌ TPAY TOKEN ERROR:", error.response?.data || error);
    return null;
  }
}

async function createTpayTransaction({ amount, orderId, email, name }) {
  try {
    const token = await getTpayToken();
    if (!token) return null;

    const payload = {
      amount: amount.toFixed(2),
      description: `Zamówienie #${orderId}`,
      payer: {
        email,
        name,
      },
      callbacks: {
        success: "https://nika-gold.net/payment-success",
        error: "https://nika-gold.net/payment-failed",
        notification: "https://api.nika-gold.net/api/tpay/webhook",
      },
    };

    const response = await axios.post(
      "https://openapi.tpay.com/transactions",
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return {
      transactionId: response.data.transactionId,
      paymentUrl: response.data.transactionPaymentUrl,
    };
  } catch (error) {
    console.error("❌ TPAY TRANSACTION ERROR:", error.response?.data || error);
    return null;
  }
}

module.exports = { createTpayTransaction };
