const Joi = require("joi");

const orderValidationSchema = Joi.object({
  productId: Joi.string().required(),
  userId: Joi.string().required(),
  status: Joi.string().valid("new", "completed", "cancelled").required(),
  totalPrice: Joi.number().required(),
  paymentStatus: Joi.string().valid("paid", "unpaid").required(),
  paymentMethod: Joi.string().valid("cash", "card").required(),
  deliveryAddress: Joi.string().required(),
  notes: Joi.string().optional(),
});

module.exports = orderValidationSchema;
