const multer = require("multer");

const storage = multer.memoryStorage(); // важливо: зберігаємо файл у пам'яті
const upload = multer({ storage });

module.exports = upload;
