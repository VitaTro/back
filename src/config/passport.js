const passport = require("passport");
const { Strategy, ExtractJwt } = require("passport-jwt");
const { User } = require("../schemas/user");
require("dotenv").config();

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.SECRET,
};
passport.use(
  new Strategy(options, async (payload, done) => {
    try {
      const user = await User.findById(payload.id);
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (error) {
      return done(error, false);
    }
  })
);
module.exports = passport;
