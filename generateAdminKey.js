const crypto = require("crypto");
const adminSecretKey = crypto.randomBytes(32).toString("hex");
console.log(adminSecretKey);
module.exports = adminSecretKey;
