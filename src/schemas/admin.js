const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  adminSecret: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin"],
    default: "admin",
  },
});

const Admin = mongoose.model("Admin", adminSchema);
module.exports = Admin;
