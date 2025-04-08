const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const authSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});
authSchema.methods.setPassword = function (password) {
  this.password = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};

authSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

const Auth = mongoose.model("Auth", authSchema);
module.exports = Auth;
