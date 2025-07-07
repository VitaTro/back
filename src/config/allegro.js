require("dotenv").config();
const axios = require("axios");

const allegroAPI = {
  clientId: process.env.ALLEGRO_CLIENT_ID,
  clientSecret: process.env.ALLEGRO_CLIENT_SECRET,
  redirectUri: process.env.ALLEGRO_REDIRECT_URI,
  authUrl: "https://allegro.pl/auth/oauth/token",
  basicAuth() {
    return Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    );
  },
  async getToken(code) {
    try {
      const response = await axios.post(
        this.authUrl,
        new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: this.redirectUri,
        }),
        {
          headers: {
            Authorization: `Basic ${this.basicAuth()}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      return response.data; // доступний access_token, refresh_token, expires_in тощо
    } catch (error) {
      console.error(
        "❌ Помилка отримання токена:",
        error.response?.data || error.message
      );
      throw error;
    }
  },
};

module.exports = allegroAPI;
