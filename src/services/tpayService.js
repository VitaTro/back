const axios = require("axios");

async function getTpayToken() {
  try {
    const params = new URLSearchParams();
    params.append("client_id", process.env.TPAY_CLIENT_ID);
    params.append("client_secret", process.env.TPAY_CLIENT_SECRET);

    const response = await axios.post(
      "https://api.tpay.com/oauth/auth",
      params,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
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
      amount: Number(amount).toFixed(2),
      description: `Zamówienie #${orderId}`,
      payer: { email, name },
      redirectUrl: "https://nika-gold.net/payment-success",
      errorUrl: "https://nika-gold.net/payment-failed",
      notificationUrl:
        "https://nika-gold-back-fe0ff35469d7.herokuapp.com/api/tpay/webhook",
    };

    const response = await axios.post(
      "https://api.tpay.com/transactions",
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
      paymentUrl: response.data.paymentUrl,
    };
  } catch (error) {
    console.error("❌ TPAY TRANSACTION ERROR:", error.response?.data || error);
    return null;
  }
}

module.exports = { createTpayTransaction };
