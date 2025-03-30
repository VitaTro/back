const { User } = require("../schemas/user");

const checkEmailAddress = async (email) => {
  return await User.findOne({ email });
};

const getCurrentUser = async (id) => {
  return await User.findById(id).select("-password -jwtToken");
};
const updateUserData = async (id, updates) => {
  return User.findByIdAndUpdate(
    id,
    { $set: updates },
    {
      new: true,
    }
  ).select("-password -jwtToken");
};
module.exports = {
  checkEmailAddress,
  getCurrentUser,
  updateUserData,
};
