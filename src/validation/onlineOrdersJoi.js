const Joi = require("joi");

const onlineOrderValidationSchema = Joi.object({
  orderId: Joi.string()
    .pattern(/^ORD-[A-Z0-9]{9}$/)
    .required(),

  userId: Joi.string().required(),

  products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        name: Joi.string().required(),
        price: Joi.number().required(),
      }),
    )
    .min(1)
    .required(),

  status: Joi.string()
    .valid("new", "received", "assembled", "shipped", "completed", "cancelled")
    .required(),

  totalPrice: Joi.number().min(0).required(),

  paymentStatus: Joi.string().valid("paid", "unpaid").required(),

  paymentMethod: Joi.string().valid("tpay").required(),

  country: Joi.string().required(),

  pickupPointId: Joi.string().when("country", {
    is: "Poland",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),

  deliveryAddress: Joi.object({
    fullName: Joi.string().required(),
    street: Joi.string().required(),
    houseNumber: Joi.string().required(),
    apartmentNumber: Joi.string().allow(""),
    city: Joi.string().required(),
    postalCode: Joi.string().required(),
  }).when("country", {
    is: Joi.string().valid("Poland").not(),
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),

  notes: Joi.string().optional(),
});

module.exports = onlineOrderValidationSchema;
