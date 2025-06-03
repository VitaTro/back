const axios = require("axios");
require("dotenv").config();

async function getAllPoints() {
  let allPoints = [];
  let page = 1;
  let totalPages = 1307;

  try {
    while (page <= totalPages) {
      console.log(`🔄 Запит сторінки ${page} з ${totalPages}...`);

      const response = await axios.get(
        `https://api-pl-points.easypack24.net/v1/points?page=${page}&per_page=25`,
        {
          headers: { Authorization: `Bearer ${process.env.INPOST_API_TOKEN}` },
        }
      );

      console.log(`✅ Отримано ${response.data.items.length} точок з API`);
      allPoints = [...allPoints, ...response.data.items];

      if (page === 1) {
        totalPages = response.data.total_pages;
      }

      page++;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`🔥 Загалом отримано ${allPoints.length} точок`);
    return allPoints;
  } catch (error) {
    console.error("❌ Помилка API:", error);
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
