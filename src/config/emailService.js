const nodemailer = require("nodemailer");
const crypto = require("crypto");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// для адміна
const sendEmail = async (to, subject, text) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };
  await transporter.sendMail(mailOptions);
};

// для користувача
const sendVerificationEmail = async (user) => {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  user.verificationToken = verificationToken;
  await user.save();

  const verificationLink = `https://nika-gold-back-fe0ff35469d7.herokuapp.com/api/user/auth/verify-email?token=${verificationToken}`;
  try {
    console.log("🔗 Generated verification link:", verificationLink);
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Confirm Your Registration",
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Welcome to Nika Gold! ✨</h2>
      <p style="color: #555; text-align: center;">Hello <strong>${user.username}</strong>,</p>
      <p style="text-align: center; color: #777;">
        Thank you for registering! Please confirm your email by clicking the button below:
      </p>
      <div style="text-align: center; margin-top: 20px;">
        <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; font-weight: bold; border-radius: 5px;">
          Confirm Email
        </a>
      </div>
      <p style="text-align: center; margin-top: 20px; color: #888;">
        If you did not request this, please ignore this email.
      </p>
    </div>
  `,
    });
    console.log("✅ Email sent successfully!");
  } catch (error) {
    console.error("🔥 Email sending error:", error);
  }
};
const sendResetPasswordEmail = async (user, resetLink) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Reset Your Password",
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #333; text-align: center;">Reset Your Password 🔑</h2>
      <p style="color: #555; text-align: center;">Hello <strong>${user.username}</strong>,</p>
      <p style="text-align: center; color: #777;">
        You requested a password reset. Click the button below to proceed:
      </p>
      <div style="text-align: center; margin-top: 20px;">
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; font-weight: bold; border-radius: 5px;">
          Reset Password
        </a>
      </div>
      <p style="text-align: center; margin-top: 20px; color: #888;">
        If you did not request this, please ignore this email.
      </p>
    </div>
  `,
    });
    console.log("✅ Reset password email sent successfully!");
  } catch (error) {
    console.error("🔥 Reset password email sending error:", error);
  }
};
const sendAdminOrderNotification = async (order) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: "📦 Nowe zamówienie w systemie!",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #333; text-align: center;">Nowe zamówienie! 🚀</h2>
        <p style="color: #555; text-align: center;">ID zamówienia: <strong>${order._id}</strong></p>
        <p style="color: #777; text-align: center;">
          Użytkownik <strong>${order.userId}</strong> złożył nowe zamówienie na kwotę <strong>${order.totalPrice} PLN</strong>.
        </p>
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://nika-gold-back-fe0ff35469d7.herokuapp.com/api/admin/finance/online/orders/${order._id}"
             style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; font-weight: bold; border-radius: 5px;">
            Sprawdź zamówienie
          </a>
        </div>
      </div>
    `,
    });
    console.log("✅ Administrator powiadomiony o nowym zamówieniu!");
  } catch (error) {
    console.error(
      "🔥 Błąd podczas wysyłania powiadomienia do administratora:",
      error
    );
  }
};
const sendAdminReturnNotification = async (order) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL, // Email administratora
      subject: "🔄 Prośba o zwrot zamówienia!",
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #333; text-align: center;">Prośba o zwrot zamówienia! ❌</h2>
        <p style="color: #555; text-align: center;">ID zamówienia: <strong>${order._id}</strong></p>
        <p style="color: #777; text-align: center;">
          Użytkownik <strong>${order.userId}</strong> zgłosił zwrot zamówienia o wartości <strong>${order.refundAmount} PLN</strong>.
        </p>
        <div style="text-align: center; margin-top: 20px;">
            <a href="https://nika-gold-back-fe0ff35469d7.herokuapp.com/api/admin/finance/online/orders/${order._id}"
             style="display: inline-block; padding: 10px 20px; background-color: #ffc107; color: black; text-decoration: none; font-weight: bold; border-radius: 5px;">
            Sprawdź zwrot
          </a>
        </div>
      </div>
    `,
    });
    console.log("✅ Administrator powiadomiony o zwrocie!");
  } catch (error) {
    console.error("🔥 Błąd podczas wysyłania powiadomienia o zwrocie:", error);
  }
};

const sendAdminMessage = async (subject, message) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL, // Email адміністратора
      subject,
      text: message,
    });
    console.log(`✅ List do administratora został wysłany: ${subject}`);
  } catch (error) {
    console.error(
      "🔥Wystąpił błąd podczas wysyłania e-maila do administratora:",
      error
    );
  }
};

module.exports = {
  transporter,
  sendEmail,
  sendAdminMessage,
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendAdminOrderNotification,
  sendAdminReturnNotification,
};
