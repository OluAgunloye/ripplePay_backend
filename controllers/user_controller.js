const User = require('../models/user');
const { tokenForUser } = require('../services/token');
const async = require('asyncawait/async');
const await = require('asyncawait/await');
const Redis = require('../services/redis');
const passwordValidator = require('../services/passwordValidator');

exports.signin = async(function(req, res) {
  let user = req.user;
  const userId = user._id;
  const loggedIn = await(Redis.getFromTheCache("logged-in", userId));

  if (loggedIn) {
    return res.status(422).json({ error: "User is already logged in elsewhere! Please wait 3 minutes." });
  }
  res.send({
    cashRegister: user.cashRegister,
    wallets: user.wallets,
    screenName: user.screenName,
    personalAddress: user.personalAddress
  });
});

exports.endsession = async(function(req, res, next) {
  const userId = req.user._id;

  Redis.removeFromCache("logged-in", userId);
  res.json({});
});

exports.comparePassword = function(req, res, next) {
  const user = req.user;
  const { password } = req.body;
  user.comparePassword(password, function (error, isMatch) {
    if (error) { return next(error); }
    if (!isMatch) { 
      res.json({success: false});
      return;
    }
    res.json({success: true});
  });
};

exports.signup = async(function(req, res, next) {
  let email = req.body.email;
  let password = req.body.password;
  
  let passwordValidationFailures = await(passwordValidator.validatePassword(password));

  if (passwordValidationFailures) {
    return res.status(422).json({ error: passwordValidationFailures });
  }

  let screenName = req.body.screenName;
  if (!email || !password || !screenName) {
    return res.status(422).json({error: "You must provide an email, password & screen name"});
  }

  User.findOne({email: email}, function(err, existingUser) {
    if (err) { return next(err); }
    if (existingUser) {return res.status(422).json({error: "Email taken"});}
    let user = new User({
      email: email,
      password: password,
      screenName: screenName
    });
    user.save(function(err) {
      if (err) { return next(err); }
      res.json({token: tokenForUser(user)});
    });
  });
});

exports.changePassword = async(function(req, res, next) {
  const { oldPassword, newPassword } = req.body;
  const user = req.user;
  user.comparePassword(oldPassword, async(function (error, isMatch) {
    if (error) { return next(error); }
    if (!isMatch) {
      res.json({ success: false });
      return;
    }
    let passwordValidationFailures = await(passwordValidator.validatePassword(newPassword));

    if (passwordValidationFailures) {
      return res.status(422).json({ error: passwordValidationFailures });
    }
    user.password = newPassword;
    user.save(function(err) {
      if (err) { return next(err); }
      return res.json({ success: true })
    });

  }));
});

exports.search = function (req, res, next) {
  const currentUser = req.user;
  let query = req.query;
  let searchKey = Object.keys(query)[0];
  let reg = new RegExp(`^${query[searchKey]}\\w*$` , 'i');
  User.find({ 'screenName': { '$regex': reg, '$ne': currentUser.screenName } }, function(err, users) {
    if (err) { return next(err); }
    res.json({search: users.map((user) => user.screenName)});
  });
};
