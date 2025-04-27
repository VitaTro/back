const Joi = require("joi");

const offlineOrderValidationSchema = Joi.object({
  products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        name: Joi.string().required(),
        price: Joi.number().required(),
      })
    )
    .required(),
  totalPrice: Joi.number().required(),
  paymentMethod: Joi.string().valid("cash", "bank_transfer").required(),
  processedBy: Joi.string().required(), // ID адміністратора

  status: Joi.string().valid("pending", "completed", "cancelled").required(),
  notes: Joi.string().optional(),
});

module.exports = offlineOrderValidationSchema;
