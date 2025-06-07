const Joi = require("joi");

const paymentValidation = Joi.object({
  userId: Joi.string().required(),
  orderId: Joi.string().required(),
  amount: Joi.number().min(1).required(),
  paymentMethod: Joi.string().valid("blik", "transfer").required(),
});

module.exports = paymentValidation;
