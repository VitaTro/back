const axios = require("axios");
require("dotenv").config();

async function getPoints() {
  try {
    const response = await axios.get("https://api.inpost.pl/v1/points", {
      headers: { Authorization: `Bearer ${process.env.INPOST_API_TOKEN}` },
    });
    return response.data; // Повертаємо дані
  } catch (error) {
    console.error("❌ Помилка API:", error.message);
    return null;
  }
}

async function trackShipment(trackingNumber) {
  try {
    const response = await axios.get(
      `https://api.inpost.pl/v1/shipments/${trackingNumber}`,
      {
        headers: { Authorization: `Bearer ${process.env.INPOST_API_TOKEN}` },
      }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Помилка відстеження посилки:", error.message);
    return null;
  }
}
module.exports = { getPoints, trackShipment };
