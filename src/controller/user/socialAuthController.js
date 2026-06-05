// const User = require("../../schemas/userSchema");
// const fetch = require("node-fetch");
// const jwt = require("jsonwebtoken");
// const { OAuth2Client } = require("google-auth-library");

// const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// const generateAccessToken = (user) =>
//   jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
//     expiresIn: "15m",
//   });

// const generateRefreshToken = (user) =>
//   jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
//     expiresIn: "365d",
//   });

// //  FACEBOOK LOGIN

// exports.facebookAuthController = async (req, res) => {
//   try {
//     const { accessToken } = req.body;

//     if (!accessToken) {
//       return res.status(400).json({ message: "Brak tokenu dostępu Facebook." });
//     }

//     const response = await fetch(
//       `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`,
//     );

//     const data = await response.json();

//     if (!data.email) {
//       return res.status(400).json({
//         message: "Facebook nie zwrócił adresu e-mail. Logowanie niemożliwe.",
//       });
//     }

//     // 2. Шукаємо користувача
//     let user = await User.findOne({ email: data.email });
//     if (user && user.providers.local) {
//       return res.status(400).json({
//         message:
//           "Ten adres e-mail jest już zarejestrowany przez zwykłą rejestrację. Zaloguj się za pomocą adresu e-mail i hasła.",
//       });
//     }
//     // 3. Якщо email існує, але provider інший → блокуємо
//     if (user) {
//       if (!user.providers.facebook) {
//         user.providers.facebook = true;
//         await user.save();
//       }
//     }

//     // 4. Якщо користувача немає — створюємо
//     if (!user) {
//       user = await User.create({
//         email: data.email,
//         username: data.name,
//         providers: { facebook: true },
//         password: null,
//         isVerified: true,
//         cart: [],
//       });
//     }

//     // 5. Генеруємо токени
//     const accessTokenJWT = generateAccessToken(user);
//     const refreshTokenJWT = generateRefreshToken(user);

//     user.refreshToken = refreshTokenJWT;
//     await user.save();

//     // res.json({
//     //   accessToken: accessTokenJWT,
//     //   refreshToken: refreshTokenJWT,
//     //   user,
//     // });
//     res.cookie("accessToken", accessTokenJWT, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//       maxAge: 1000 * 60 * 15, // 15 minut
//     });
//     res.cookie("refreshToken", refreshTokenJWT, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//       maxAge: 1000 * 60 * 60 * 24 * 365, // 1 рік
//     });
//     res.json({ message: "Login successful", user });
//   } catch (err) {
//     res.status(400).json({
//       message: "Logowanie przez Facebook nie powiodło się.",
//       error: err.message,
//     });
//   }
// };

// //  GOOGLE LOGIN

// exports.googleAuthController = async (req, res) => {
//   try {
//     const { credential } = req.body;

//     if (!credential) {
//       return res.status(400).json({ message: "Brak tokenu Google." });
//     }

//     // 1. Перевіряємо Google токен
//     const ticket = await googleClient.verifyIdToken({
//       idToken: credential,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });

//     const payload = ticket.getPayload();
//     const email = payload.email;
//     const name = payload.name;

//     // 2. Шукаємо користувача
//     let user = await User.findOne({ email });
//     if (user && user.providers.local) {
//       return res.status(400).json({
//         message:
//           "Ten adres e-mail jest już zarejestrowany przez zwykłą rejestrację. Zaloguj się za pomocą adresu e-mail i hasła.",
//       });
//     }
//     // 3. Якщо email існує, але provider інший → блокуємо
//     if (user) {
//       if (!user.providers.google) {
//         user.providers.google = true;
//         await user.save();
//       }
//     }

//     // 4. Якщо користувача немає — створюємо
//     if (!user) {
//       user = await User.create({
//         email,
//         username: name,
//         providers: { google: true },
//         password: null,
//         isVerified: true,
//         cart: [],
//       });
//     }

//     // 5. Генеруємо токени
//     const accessTokenJWT = generateAccessToken(user);
//     const refreshTokenJWT = generateRefreshToken(user);

//     user.refreshToken = refreshTokenJWT;
//     await user.save();

//     // res.json({
//     //   accessToken: accessTokenJWT,
//     //   refreshToken: refreshTokenJWT,
//     //   user,
//     // });
//     res.cookie("accessToken", accessTokenJWT, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//       maxAge: 1000 * 60 * 15,
//     });
//     res.cookie("refreshToken", refreshTokenJWT, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//       maxAge: 1000 * 60 * 60 * 24 * 365,
//     });
//     res.json({ message: "Login successful", user });
//   } catch (err) {
//     res.status(400).json({
//       message: "Logowanie przez Google nie powiodło się.",
//       error: err.message,
//     });
//   }
// };
// exports.refreshTokenController = async (req, res) => {
//   try {
//     const token = req.cookies.refreshToken;
//     if (!token) return res.sendStatus(401);

//     const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
//     const user = await User.findById(decoded.id);

//     if (!user || user.refreshToken !== token) {
//       return res.sendStatus(403);
//     }

//     const newAccessToken = generateAccessToken(user);

//     res.cookie("accessToken", newAccessToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
//       maxAge: 1000 * 60 * 15,
//     });

//     res.json({ ok: true });
//   } catch (err) {
//     res.sendStatus(403);
//   }
// };
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
    if (user && user.providers.local) {
      return res.status(400).json({
        message:
          "Ten adres e-mail jest już zarejestrowany przez zwykłą rejestrację. Zaloguj się za pomocą adresu e-mail i hasła.",
      });
    }
    // 3. Якщо email існує, але provider інший → блокуємо
    if (user) {
      if (!user.providers.facebook) {
        user.providers.facebook = true;
        await user.save();
      }
    }
    // 4. Якщо користувача немає — створюємо
    if (!user) {
      user = await User.create({
        email: data.email,
        username: data.name,
        providers: { facebook: true },
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
    res.cookie("userToken", accessTokenJWT, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 днів
    });

    res.json({ message: "Login successful", user });
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
    if (user && user.providers.local) {
      return res.status(400).json({
        message:
          "Ten adres e-mail jest już zarejestrowany przez zwykłą rejestrację. Zaloguj się za pomocą adresu e-mail i hasła.",
      });
    }
    // 3. Якщо email існує, але provider інший → блокуємо
    if (user) {
      if (!user.providers.google) {
        user.providers.google = true;
        await user.save();
      }
    }

    // 4. Якщо користувача немає — створюємо
    if (!user) {
      user = await User.create({
        email,
        username: name,
        providers: { google: true },
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
    // res.json({
    //   accessToken: accessTokenJWT,
    //   refreshToken: refreshTokenJWT,
    //   user,
    // });
    res.cookie("userToken", accessTokenJWT, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    res.json({ message: "Login successful", user });
  } catch (err) {
    res.status(400).json({
      message: "Logowanie przez Google nie powiodło się.",
      error: err.message,
    });
  }
};
