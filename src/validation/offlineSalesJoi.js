const Joi = require("joi");

const offlineSaleValidationSchema = Joi.object({
  orderId: Joi.string().required(), // 🔹 Обовʼязковий звʼязок з OfflineOrder
  products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        name: Joi.string().required(),
        price: Joi.number().required(),
        photoUrl: Joi.string().uri().required(),
        color: Joi.string().optional(), // 👕 якщо додано — обов’язково зазначаємо
      })
    )
    .required(),
  totalAmount: Joi.number().required(), // 💰 Загальна сума продажу
  paymentMethod: Joi.string().valid("BLIK", "bank_transfer").required(),
  status: Joi.string()
    .valid("pending", "completed", "cancelled", "returned")
    .required(),
  refundAmount: Joi.number().min(0).optional(), // 💸 для повернень
  notes: Joi.string().optional(),
  buyerType: Joi.string().valid("anonim", "przedsiębiorca").optional(),
  buyerName: Joi.when("buyerType", {
    is: "przedsiębiorca",
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),
  buyerAddress: Joi.when("buyerType", {
    is: "przedsiębiorca",
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),
  buyerNIP: Joi.when("buyerType", {
    is: "przedsiębiorca",
    then: Joi.string().required(),
    otherwise: Joi.forbidden(),
  }),
  saleDate: Joi.date().optional(), // для ручних/старих операцій
});

module.exports = offlineSaleValidationSchema;
