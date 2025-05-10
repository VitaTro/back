const Joi = require("joi");

const onlineSaleValidationSchema = Joi.object({
  products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        salePrice: Joi.number().required(),
      })
    )
    .required(),
  totalAmount: Joi.number().required(),
  paymentMethod: Joi.string().valid("card", "bank_transfer").required(),
  processedBy: Joi.string().optional(),
  status: Joi.string()
    .valid("new", "completed", "cancelled", "returned")
    .required(),
  notes: Joi.string().optional(),
});

module.exports = onlineSaleValidationSchema;
