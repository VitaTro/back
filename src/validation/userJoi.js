const Joi = require("joi");

const userValidationSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(20)
    .pattern(/^(?!\s)[a-zA-Z0-9_ ]*(?<!\s)$/)
    .required()
    .messages({
      "string.empty": "Username cannot be empty",
      "string.min": "Username must be at least 3 characters",
      "string.max": "Username cannot exceed 20 characters",
      "string.pattern.base":
        "Username can only contain letters, numbers, and underscores",
    }),

  email: Joi.string().email().required().messages({
    "string.empty": "Email cannot be empty",
    "string.email": "Invalid email format",
  }),

  password: Joi.string().min(10).required().messages({
    "string.empty": "Password cannot be empty",
    "string.min": "Password must be at least 10 characters long",
  }),
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
