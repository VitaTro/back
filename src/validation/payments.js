const Joi = require("joi");

const paymentValidation = Joi.object({
  userId: Joi.string().required(),
  orderId: Joi.string().required(),
  amount: Joi.number().min(1).required(),
  paymentMethod: Joi.string().valid("BLIK", "bank_transfer").required(),
  paymentCode: Joi.alternatives().conditional("paymentMethod", {
    is: "BLIK",
    then: Joi.string().length(6).pattern(/^\d+$/).required(), // 6 цифр для BLIK
    otherwise: Joi.object({
      cardNumber: Joi.string().length(16).pattern(/^\d+$/).required(), // 16 цифр
      expiryDate: Joi.string()
        .pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)
        .required(), // MM/YY
      cvv: Joi.string().length(3).pattern(/^\d+$/).required(), // 3 цифри CVV
      cardHolder: Joi.string().optional(), // Може бути пустим
    }).required(),
  }),
});

module.exports = paymentValidation;
