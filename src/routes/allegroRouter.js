const express = require("express");
const router = express.Router();
const allegroAPI = require("../config/allegro");

router.get("/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Missing authorization code.");
  }

  try {
    const tokenData = await allegroAPI.getToken(code);

    res.json({
      message: "🎉 Authorization successful!",
      tokens: tokenData,
    });
  } catch (error) {
    console.error(
      "Token exchange failed:",
      error.response?.data || error.message
    );
    res.status(500).send("😬 Something went wrong during token exchange.");
  }
});

module.exports = router;
