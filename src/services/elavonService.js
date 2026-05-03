const axios = require("axios");
require("dotenv").config();

const BASE_URL = "https://uat.api.converge.eu.elavonaws.com/payment-links";

async function createPaylink({
  amount,
  currency = "PLN",
  orderId,
  email,
  expiryDate,
}) {
  try {
    const payload = {
      expiresAt: `${expiryDate}T23:59:00.000Z`,
      doCapture: true,
      total: {
        amount: Number(amount).toFixed(2),
        currencyCode: currency,
      },
      orderReference: orderId,
      shopperEmailAddress: email,
    };

    const authHeader =
      "Basic " +
      Buffer.from(
        `${process.env.ELAVON_PUBLIC_KEY}:${process.env.ELAVON_SECRET_KEY}`,
      ).toString("base64");

    const response = await axios.post(BASE_URL, payload, {
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        Accept: "application/json;charset=UTF-8",
        Authorization: authHeader,
        "Accept-Version": "1",
      },
    });

    return {
      id: response.data.id,
      url: response.data.url,
    };
  } catch (error) {
    console.error("❌ Elavon Paylink Error:", error.response?.data || error);
    return null;
  }
}

module.exports = { createPaylink };
