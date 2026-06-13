const Joi = require("joi");

const offlineSaleValidationSchema = Joi.object({
  orderId: Joi.string().required(),
  products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        name: Joi.string().required(),
        price: Joi.number().required(),
        photoUrl: Joi.string().uri().required(),
        color: Joi.string().optional(),
        size: Joi.string().optional(),
        sku: Joi.string().optional(),
      }),
    )
    .required(),
  totalAmount: Joi.number().required(),
  paymentMethod: Joi.string()
    .valid("BLIK", "bank_transfer", "cash")
    .when("isReservation", {
      is: true,
      then: Joi.forbidden(),
      otherwise: Joi.required(),
    }),
  status: Joi.string()
    .valid("pending", "completed", "cancelled", "returned", "reserved")
    .required(),
  isReservation: Joi.boolean().default(false),

  reservationExpiresAt: Joi.date().when("isReservation", {
    is: true,
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  refundAmount: Joi.number().min(0).optional(), // 💸 для повернень

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
  saleDate: Joi.date().optional(),
});

module.exports = offlineSaleValidationSchema;
