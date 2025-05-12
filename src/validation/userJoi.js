const Joi = require("joi");

const userValidationSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(20)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required(),

  email: Joi.string().email().required(),
  password: Joi.string().min(10).required(),
});

const adminValidationSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(10)
    .pattern(new RegExp("^(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])"))
    .required(),
  adminSecret: Joi.string().required(), // Тут обов'язково для адміна
});
const loginValidationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(10)
    .pattern(new RegExp("^(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])"))
    .required(),
});
module.exports = {
  userValidationSchema,
  adminValidationSchema,
  loginValidationSchema,
};
