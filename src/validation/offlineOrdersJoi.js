const Joi = require("joi");

const offlineOrderValidationSchema = Joi.object({
  products: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().min(1).required(),
        name: Joi.string().required(),
        price: Joi.number().required(),
        photoUrl: Joi.string().uri().required(),
      })
    )
    .required(),
  totalPrice: Joi.number().required(),
  paymentMethod: Joi.string().valid("BLIK", "bank_transfer").required(),
  status: Joi.string().valid("pending", "completed", "cancelled").required(),

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
});

module.exports = offlineOrderValidationSchema;
