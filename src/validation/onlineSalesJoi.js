const Joi = require("joi");

const onlineSaleValidationSchema = Joi.object({
  userId: Joi.string().required(),
  onlineOrderId: Joi.string().required(),

  products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        salePrice: Joi.number().required(),
      }),
    )
    .required(),

  totalAmount: Joi.number().min(0).required(),

  shippingCost: Joi.number().min(0).required(),

  paymentMethod: Joi.string().valid("tpay").required(),

  processedBy: Joi.string().optional(),

  status: Joi.string()
    .valid("new", "completed", "cancelled", "returned")
    .required(),

  notes: Joi.string().optional(),
});

module.exports = onlineSaleValidationSchema;
