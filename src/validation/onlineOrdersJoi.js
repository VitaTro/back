const Joi = require("joi");

const onlineOrderValidationSchema = Joi.object({
  products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        name: Joi.string().optional(), // 🔹 name неважливий
        price: Joi.number().optional(), // 🔹 price неважливий
      })
    )
    .required(),
  userId: Joi.string().optional(), // 🔹 userId неважливий
  status: Joi.string().valid("new", "completed", "cancelled").optional(), // 🔹 Статус неважливий
  totalPrice: Joi.number().optional(), // 🔹 Загальна сума неважлива
  paymentStatus: Joi.string().valid("paid", "unpaid").optional(), // 🔹 Статус оплати неважливий
  paymentMethod: Joi.string().valid("cash", "card").optional(), // 🔹 Метод оплати неважливий
  deliveryType: Joi.string().valid("courier", "smartbox", "pickup").optional(), // 🔹 Тип доставки неважливий
  smartboxDetails: Joi.object({
    boxId: Joi.string().optional(), // 🔹 Додаткові деталі доставки неважливі
    location: Joi.string().optional(),
  }).optional(),
  deliveryAddress: Joi.string().when("deliveryType", {
    is: "courier",
    then: Joi.optional(),
    otherwise: Joi.optional(),
  }),
  notes: Joi.string().optional(), // 🔹 Примітки неважливі
});

module.exports = onlineOrderValidationSchema;
