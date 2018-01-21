const User = require('../models/user');
const { tokenForUser } = require('../services/token');
const async = require('asyncawait/async');
const await = require('asyncawait/await');
const passwordValidator = require('../services/passwordValidator');

exports.signin = function(req, res) {
  let user = req.user;
  res.send({
    cashRegister: user.cashRegister,
    wallets: user.wallets,
    screenName: user.screenName,
    personalAddress: user.personalAddress
  });
};

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
