require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const app = require("./App");
require("./cronTasks");

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: "nika",
  })

  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((error) => {
    console.error("Connection error", error.message);
  });

// try {
//   const imageUrl = cloudinary.url("products/image1", {
//     fetch_format: "auto",
//     quality: "auto",
//   });
//   console.log(imageUrl);
// } catch (error) {
//   console.error("Error generating image URL: ", error.message);
// }

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
