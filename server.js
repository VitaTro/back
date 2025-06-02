require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { initSocket } = require("./src/config/socket");
const http = require("http");
const { getAllPoints } = require("./src/config/inpostService");
const app = require("./App");
require("./cronTasks");

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, { dbName: "nika" })
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((error) => console.error("Connection error", error.message));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
