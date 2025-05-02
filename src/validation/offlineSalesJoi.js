const Joi = require("joi");

const offlineSaleValidationSchema = Joi.object({
  products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        name: Joi.string().required(),
        price: Joi.number().required(),
        photoUrl: Joi.string().uri().required(),
      })
    )
    .required(),
  totalAmount: Joi.number().required(),
  paymentMethod: Joi.string().valid("cash", "bank_transfer").required(),
  status: Joi.string().valid("pending", "completed", "cancelled").required(),
  notes: Joi.string().optional(),
});

module.exports = offlineSaleValidationSchema;
