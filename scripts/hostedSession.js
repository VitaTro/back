// const axios = require("axios");

// async function createHostedSession() {
//   const payload = {
//     merchantAlias: process.env.ELAVON_MERCHANT_ALIAS,
//     processorId: process.env.ELAVON_PROCESSOR_ID,
//     amount: 2.13,
//     currency: "PLN",
//     orderId: "ORD-ABC123",
//     customerEmail: "test@example.com",
//     expiryDate: "2025-07-17",
//     returnUrl: "https://nika-gold.net/success",
//     cancelUrl: "https://nika-gold.net/cancel",
//     failUrl: "https://nika-gold.net/fail",
//   };

//   try {
//     const response = await axios.post(
//       "https://api.eu.convergepay.com/hosted-payments/payment_sessions",
//       payload,
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.ELAVON_SECRET_KEY}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     console.log("🎟️ Session created:", response.data.sessionId);
//     return response.data.sessionId;
//   } catch (error) {
//     console.error(
//       "❌ Failed to create session:",
//       error.response?.data || error.message
//     );
//   }
// }
const axios = require("axios");
require("dotenv").config();

const MERCHANT_ALIAS = process.env.ELAVON_MERCHANT_ALIAS;
const SECRET_KEY = process.env.ELAVON_SECRET_KEY;

const authString = Buffer.from(`${MERCHANT_ALIAS}:${SECRET_KEY}`).toString(
  "base64"
);

const createOrder = async () => {
  try {
    const response = await axios.post(
      "https://uat.api.converge.eu.elavonaws.com/orders",
      {
        amount: 100, // сума в СЕНТАХ (тобто 10.00 EUR = 1000)
        currency: "EUR",
        captureMode: "AUTO", // або "MANUAL", залежно від вашої логіки
        paymentMethod: {
          type: "CARD",
          card: {
            number: "4111111111111111", // тестова картка
            expiryMonth: "12",
            expiryYear: "2030",
            cvv: "123",
          },
        },
        customer: {
          email: "customer@email.com",
        },
      },
      {
        headers: {
          Authorization: `Basic ${authString}`,
          Accept: "application/json;charset=UTF-8",
          "Accept-Version": "1",
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      }
    );

    console.log("✅ Створено замовлення:", response.data);
  } catch (error) {
    console.error(
      "❌ Помилка при створенні:",
      error.response?.data || error.message
    );
  }
};

createOrder();
