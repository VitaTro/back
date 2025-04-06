const Joi = require("joi");

const userValidationSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(10).required(),
});
module.exports = userValidationSchema;
