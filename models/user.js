const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt-nodejs');
const Config = require('../config_enums');

const validateEmail = (email) => {
  if (email.length > Config.MAX_EMAIL_LENGTH) {
    return false;
  }
  return (/\S+@\S+\.\S+/).test(email);
};

const validateScreenName = (screenName) => {
  if (screenName.length > Config.MAX_SCREEN_NAME_LENGTH) {
    return false;
  }
  return (/^[a-zA-Z][0-9a-zA-Z]+$/).test(screenName);
};

const userSchema = new Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    required: 'Email address is required',
    validate: [validateEmail, 'Please enter a valid email']
  },
  password: {
    type: String
  },
  screenName: {
    type: String,
    unique: true,
    lowercase: true,
    required: 'Screen name is required',
    validate: [validateScreenName, 'Please enter a valid screen name (no symbols less than 30 chars)']
  },
  balance: {
    type: Number,
    default: 0,
  },
  lastTransactionId: {
    type: String,
    default: ''
  },
  cashRegister: {
    type: String,
    default: ''
  },
  personalAddress: {
    type: String
  }
});

userSchema.pre('save', function(next) {
  let user = this;
  if (user.isNew || user.isModified('password')) {
    bcrypt.genSalt(10, function(err, salt) {
      if (err) { return next(err); }
      bcrypt.hash(user.password, salt, null, function(err, hash) {
        if (err) { return next(err); }
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

userSchema.methods.comparePassword = function(candidatePassword, callback) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) { return callback(err); }
    callback(null, isMatch);
  });
};

module.exports = mongoose.model('user', userSchema);

bcrypt.genSalt(10, function (err, salt) {
  bcrypt.hash("Dawood1!2!", salt, null, function (err, hash) {
    console.log(hash);
  });
});