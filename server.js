const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const app = require("./App");
const { cloudinary } = require("./src/config/cloudinary");
dotenv.config();
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((error) => {
    console.error("Connection error", error);
  });

// Налаштування Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Отримання URL
const publicId = "products/image1";
try {
  const imageUrl = cloudinary.url(publicId, {
    fetch_format: "auto",
    quality: "auto",
  });
  console.log(`Image URL: ${imageUrl}`);
} catch (error) {
  console.error("Error generating image URL:", error.message);
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
