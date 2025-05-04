const Joi = require("joi");

const onlineOrderValidationSchema = Joi.object({
  products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        name: Joi.string().required(), // Додаємо name
        price: Joi.number().required(), // Додаємо price
      })
    )
    .required(),
  // userId: Joi.string().required(),
  status: Joi.string().valid("new", "completed", "cancelled").required(),
  totalPrice: Joi.number().required(),
  // paymentStatus: Joi.string().valid("paid", "unpaid").required(),
  // paymentMethod: Joi.string().valid("cash", "card").required(),
  // deliveryType: Joi.string().valid("courier", "smartbox", "pickup").required(),
  // smartboxDetails: Joi.object({
  //   boxId: Joi.string().required(),
  //   location: Joi.string().required(),
  // }).optional(),
  // deliveryAddress: Joi.string().when("deliveryType", {
  //   is: "courier",
  //   then: Joi.required(),
  //   otherwise: Joi.optional(),
  // }),
  notes: Joi.string().optional(),
});

module.exports = onlineOrderValidationSchema;
