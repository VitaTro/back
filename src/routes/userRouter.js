const express = require("express");
const {
  checkAdmin,
  registerAdmin,
  registerUser,
} = require("../controller/userController");
const adminSecretKey = require("../../generateAdminKey");
const router = express.Router();

router.get("/check-admin", checkAdmin);
router.post(
  "/register/admin",
  (req, res, next) => {
    const { key } = req.body;
    if (key !== adminSecretKey) {
      return res.status(403).send("Access Denied! Invalid Admin key!");
    }
    next();
  },
  registerAdmin
);
router.post("/register/user", registerUser);
module.exports = router;
