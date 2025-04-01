require("../../config");
const nodemailer = require("nodemailer");
const { EMAIL_USER, EMAIL_PASS } = process.env;

const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false, // upgrade later with STARTTLS
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});
const sendEmail = async (to, html) => {
  const info = await transporter.sendMail({
    from: "lija.trojan8.gmail.com@getresponsesend.com",
    to: "recipient-email@example.com",
    subject: "Thanks for subscribing Nika Gold!",
    html: `<div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
          <h1>Thank You!</h1>
          <p>Thank you for subscribing Nika Gold newsletter.</p>
          <p>
            We're excited to keep you updated with our latest news and offers.
          </p>
        </div>`,
  });

  transporter.sendMail(sendEmail, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
  console.log("Message sent: %s", info.messageId);
};

module.exports = { sendEmail };
