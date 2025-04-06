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

module.exports = { userValidationSchema, adminValidationSchema };
