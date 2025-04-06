const Joi = require("joi");

const userValidationSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(10).required(),
});

const adminValidationSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(10).required(),
  adminSecret: Joi.string().required(), // Тут обов'язково для адміна
});
const loginValidationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});
module.exports = {
  userValidationSchema,
  adminValidationSchema,
  loginValidationSchema,
};
