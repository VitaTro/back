const { User } = require("../schemas/user");
const emailSubscription = require("../email/email");
const Joi = require("joi");

const subscriptionSchema = Joi.object({
  email: Joi.string().email().required(),
});

const subscription = async (req, res) => {
  const { error } = subscriptionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { email } = req.body;
  const userId = req.user._id; // Assuming user ID is set in req.user by passport JWT authentication
  const user = await User.findById(userId);

  try {
    if (!email) {
      return res.status(400).json({
        status: "Not found",
        code: 400,
        message: "Missing required field email",
      });
    }

    if (!user) {
      return res.status(401).json({
        status: "Unauthorized",
        code: 401,
        message: "User not found",
      });
    }

    if (user.email !== email) {
      return res.status(400).json({
        status: "Bad request",
        code: 400,
        message: "The provided email does not match the logged-in user's email",
      });
    }

    if (user.subscription === true) {
      return res.status(400).json({
        status: "Bad request",
        code: 400,
        message: "You are already subscribed to our newsletter",
      });
    }

    if (user.subscription === false) {
      await emailSubscription.sendEmail(email);
      user.subscription = true;
      await user.save();
      return res.json({
        status: "success",
        code: 200,
        message: "Subscription email sent",
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "error",
      code: 500,
      message: "Internal server error",
    });
  }
};

module.exports = {
  subscription,
};
