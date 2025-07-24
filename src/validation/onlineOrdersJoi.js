const Joi = require("joi");

const onlineOrderValidationSchema = Joi.object({
  orderId: Joi.string()
    .pattern(/^ORD-[A-Z0-9]{9}$/) // ✅ Перевіряємо унікальний формат ID
    .required(),
  userId: Joi.string().required(),
  products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        name: Joi.string().required(),
        price: Joi.number().required(),
      })
    )
    .min(1)
    .required(),
  // totalQuantity: Joi.number().min(1).required(),
  status: Joi.string()
    .valid("new", "received", "assembled", "shipped", "completed", "cancelled")
    .required(),
  statusHistory: Joi.array().items(
    Joi.object({
      status: Joi.string()
        .valid(
          "new",
          "received",
          "assembled",
          "shipped",
          "completed",
          "cancelled"
        )
        .required(),
      updatedBy: Joi.string().required(),
      updatedAt: Joi.date().default(Date.now),
    })
  ),
  totalPrice: Joi.number().min(0).required(),
  paymentStatus: Joi.string().valid("paid", "unpaid").required(),
  paymentMethod: Joi.string().valid("elavon_link", "bank_transfer").required(),

  deliveryType: Joi.string().valid("courier", "smartbox", "pickup").required(),
  deliveryAddress: Joi.object({
    postalCode: Joi.string()
      .pattern(/^\d{5}$/)
      .required(),
    city: Joi.string().required(),
    street: Joi.string().required(),
    houseNumber: Joi.string().required(),
    apartmentNumber: Joi.string().allow(""),
    isPrivateHouse: Joi.boolean().required(),
  }).when("deliveryType", {
    is: "courier",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  smartboxDetails: Joi.object({
    boxId: Joi.string().required(),
    location: Joi.string().required(),
  }).when("deliveryType", {
    is: "smartbox",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  deliveryAddress: Joi.string().when("deliveryType", {
    is: "courier",
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  notes: Joi.string().optional(),
  timestamps: Joi.object({
    createdAt: Joi.date().default(Date.now),
    updatedAt: Joi.date().default(Date.now),
  }).optional(),
});

module.exports = onlineOrderValidationSchema;
