const passport = require('passport');
const ExtractJwt = require('passport-jwt').ExtractJwt;
const JwtStrategy = require('passport-jwt').Strategy;
const LocalStrategy = require('passport-local');
const Redis = require('../services/redis');

const User = require('../models/user');
let secret;
if (process.env.NODE_ENV=='production') {
  secret = process.env.SECRET;
} else {
  secret = require('../configs/config').SECRET;
}

let localOptions = {
  usernameField: 'email'
};

let localStrategy = new LocalStrategy(localOptions, function(email, password, done) {
  // Verify this username and password
  User.findOne({email: email.toLowerCase()}, function(err, user) {
    if (err) { return done(err); }
    if (!user) { return done("Wrong email/password combination"); }
    user.comparePassword(password, function(error, isMatch) {
      if (error) { return done(error); }
      if (!isMatch) { return done("Wrong email/password combination"); }
      // after this is done, returning the following will return the user object to
      return done(null, user);
    });
  });
});

let jwtOptions = {
  secretOrKey: secret,
  jwtFromRequest: ExtractJwt.fromHeader('authorization')
};

let jwtStrategy = new JwtStrategy(jwtOptions, function(payload, done) {
  const userId = payload.sub;

  if (new Date().getTime() > payload.exp) {
    const problem = "token has expired!!";
    Redis.removeFromCache("logged-in", userId);
    return done(null, problem);
  }

  User.findById(userId, function(err, user) {
    if (err) { return done(err, false); }
    if (user) {
      done(null, user);
    } else {
      done(null, false);
    }
  });
});

passport.use(localStrategy);
passport.use(jwtStrategy);
