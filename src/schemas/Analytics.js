const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema({
  page: { type: String, required: true },
  date: { type: String, required: true },
  count: { type: Number, default: 1 },
});
module.exports = mongoose.model("Analytics", analyticsSchema);
