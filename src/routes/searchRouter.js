const express = require("express");
const axios = require("axios");
const router = express.Router();

router.get("/search", async (req, res) => {
  console.log("Route /search was hit");

  try {
    const query = req.query.query || req.query.q || "";
    console.log("Received query parameter:", query);

    if (!query.trim()) {
      console.log("Query parameter is missing");
      return res.status(400).json({
        status: "error",
        message: 'Query parameter "query" or "q" is required',
        data: null,
      });
    }

    console.log("Performing external search with:", query);

    // Запит до зовнішнього API
    const externalResponse = await axios.get(
      "https://nika-gold-back-fe0ff35469d7.herokuapp.com/api/products",
      {
        params: { query: query }, // Передаємо параметр query
      }
    );

    const products = externalResponse.data;

    const filteredProducts = products.filter(
      (product) =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase())
    );
    // Перевірка результатів
    if (!filteredProducts.length) {
      console.log(`No products found for query: "${query}"`);
      return res.status(404).json({
        status: "error",
        message: "No products found matching the query",
        data: [],
      });
    }

    console.log("Returning matched products...");
    return res.status(200).json({
      status: "success",
      message: "Products fetched successfully",
      data: filteredProducts,
    });
  } catch (error) {
    console.error("Error in search route:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch products",
      data: null,
    });
  }
});

module.exports = router;
