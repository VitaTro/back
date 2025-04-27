const Joi = require("joi");

const offlineSaleValidationSchema = Joi.object({
  products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        price: Joi.number().required(),
      })
    )
    .required(),
  totalAmount: Joi.number().required(),
  paymentMethod: Joi.string().valid("cash", "bank_transfer").required(),
  processedBy: Joi.string().required(), // ID адміністратора

  notes: Joi.string().optional(),
});

module.exports = offlineSaleValidationSchema;
