const axios = require("axios");
require("dotenv").config();

async function getAllPoints() {
  let allPoints = [];
  let page = 1;
  let totalPages = 10; // Почнемо з 10 сторінок, потім можна збільшити

  try {
    while (page <= totalPages) {
      console.log(`🔄 Запит сторінки ${page} з ${totalPages}...`);

      const response = await axios.get(
        `https://api-pl-points.easypack24.net/v1/points?page=${page}&per_page=100`,
        {
          headers: { Authorization: `Bearer ${process.env.INPOST_API_TOKEN}` },
        }
      );

      allPoints = [...allPoints, ...response.data.points];

      if (page === 1) {
        totalPages = response.data.total_pages; // Оновлюємо загальну кількість сторінок
      }

      page++;

      // 🔹 Додаємо паузу 500 мс між запитами, щоб сервер не "впав"
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`✅ Завантажено ${allPoints.length} точок`);
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
