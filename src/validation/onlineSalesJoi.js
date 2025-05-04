const Joi = require("joi");

const onlineSaleValidationSchema = Joi.object({
  products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        salePrice: Joi.number().optional(), // 🔹 Ціна за одиницю неважлива
      })
    )
    .optional(), // 🔹 Масив продуктів неважливий
  totalAmount: Joi.number().optional(), // 🔹 Загальна сума неважлива
  paymentMethod: Joi.string().valid("card", "bank_transfer").optional(), // 🔹 Метод оплати неважливий
  processedBy: Joi.string().optional(), // 🔹 Адміністратор неважливий
  notes: Joi.string().optional(), // 🔹 Примітки неважливі
});

module.exports = onlineSaleValidationSchema;
