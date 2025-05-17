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
module.exports = { sendEmail, sendVerificationEmail };
