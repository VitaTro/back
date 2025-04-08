const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  preferences: {
    type: Array,
    default: [],
  },
  role: {
    type: String,
    enum: ["user"],
    default: "user",
  },
});

const User = mongoose.model("User", userSchema);
module.exports = User;
