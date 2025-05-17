const crypto = require("crypto");
const adminSecretKey = crypto.randomBytes(32).toString("hex");

module.exports = adminSecretKey;
