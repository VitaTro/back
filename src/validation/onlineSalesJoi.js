const Joi = require("joi");

const onlineSaleValidationSchema = Joi.object({
  products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        salePrice: Joi.number().required(), // Ціна за одиницю
      })
    )
    .required(), // Масив продуктів обов'язковий
  totalAmount: Joi.number().required(), // Загальна сума обов'язкова
  paymentMethod: Joi.string().valid("card", "bank_transfer").required(), // Дозволені методи оплати
  processedBy: Joi.string().required(), // Адміністратор обов'язковий
  notes: Joi.string().optional(), // Примітки опціональні
});

module.exports = onlineSaleValidationSchema;
