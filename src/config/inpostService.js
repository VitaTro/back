const axios = require("axios");
require("dotenv").config();

async function getAllPoints() {
  let allPoints = [];
  let page = 1;
  let totalPages = 50; // Можна збільшити, якщо потрібно

  try {
    while (page <= totalPages) {
      const response = await axios.get(
        `https://api-pl-points.easypack24.net/v1/points?page=${page}&per_page=100`,
        {
          headers: { Authorization: `Bearer ${process.env.INPOST_API_TOKEN}` },
        }
      );

      allPoints = [...allPoints, ...response.data.points];

      // 🔹 Оновлюємо загальну кількість сторінок (можливо вона зміниться після першого запиту)
      if (page === 1) {
        totalPages = response.data.total_pages;
      }

      page++;
    }

    return allPoints;
  } catch (error) {
    console.error("❌ Помилка API:", error.message);
    return [];
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
module.exports = { getAllPoints, trackShipment };
