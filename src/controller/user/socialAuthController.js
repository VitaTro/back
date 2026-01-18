const User = require("../../schemas/userSchema");
const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

const generateRefreshToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "365d",
  });

//  FACEBOOK LOGIN

exports.facebookAuthController = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: "Brak tokenu dostępu Facebook." });
    }

    const response = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`,
    );

    const data = await response.json();

    if (!data.email) {
      return res.status(400).json({
        message: "Facebook nie zwrócił adresu e-mail. Logowanie niemożliwe.",
      });
    }

    // 2. Шукаємо користувача
    let user = await User.findOne({ email: data.email });

    // 3. Якщо email існує, але provider інший → блокуємо
    if (user) {
      if (!user.providers.includes("facebook")) {
        user.providers.push("facebook");
        await user.save();
      }
    }

    // 4. Якщо користувача немає — створюємо
    if (!user) {
      user = await User.create({
        email: data.email,
        username: data.name,
        providers: ["facebook"],
        password: null,
        isVerified: true,
        cart: [],
      });
    }

    // 5. Генеруємо токени
    const accessTokenJWT = generateAccessToken(user);
    const refreshTokenJWT = generateRefreshToken(user);

    user.refreshToken = refreshTokenJWT;
    await user.save();

    res.json({
      accessToken: accessTokenJWT,
      refreshToken: refreshTokenJWT,
      user,
    });
  } catch (err) {
    res.status(400).json({
      message: "Logowanie przez Facebook nie powiodło się.",
      error: err.message,
    });
  }
};

//  GOOGLE LOGIN

exports.googleAuthController = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Brak tokenu Google." });
    }

    // 1. Перевіряємо Google токен
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;

    // 2. Шукаємо користувача
    let user = await User.findOne({ email });

    // 3. Якщо email існує, але provider інший → блокуємо
    if (user) {
      if (!user.providers.includes("google")) {
        user.providers.push("google");
        await user.save();
      }
    }

    // 4. Якщо користувача немає — створюємо
    if (!user) {
      user = await User.create({
        email,
        username: name,
        providers: ["google"],
        password: null,
        isVerified: true,
        cart: [],
      });
    }

    // 5. Генеруємо токени
    const accessTokenJWT = generateAccessToken(user);
    const refreshTokenJWT = generateRefreshToken(user);

    user.refreshToken = refreshTokenJWT;
    await user.save();

    res.json({
      accessToken: accessTokenJWT,
      refreshToken: refreshTokenJWT,
      user,
    });
  } catch (err) {
    res.status(400).json({
      message: "Logowanie przez Google nie powiodło się.",
      error: err.message,
    });
  }
};
