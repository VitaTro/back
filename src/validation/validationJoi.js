const Joi = require("joi");

const registerSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .pattern(/^[a-zA-Z\s]+$/)
    .required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .pattern(/[A-Z]/)
    .pattern(/[a-z]/)
    .pattern(/\d/)
    .required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .pattern(/[A-Z]/)
    .pattern(/[a-z]/)
    .pattern(/\d/)
    .required(),
});
const userNameSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .pattern(/^[a-zA-Z\s]+$/)
    .required(),
});
module.exports = { registerSchema, loginSchema, userNameSchema };
