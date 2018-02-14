const User = require('../models/user');
const { tokenForUser } = require('../services/token');
const async = require('asyncawait/async');
const await = require('asyncawait/await');
const Redis = require('../services/redis');
const passwordValidator = require('../services/passwordValidator');
const Lock = require('../services/lock');
const RippledServer = require('../services/rippleAPI');
const rippledServer = new RippledServer();

exports.signin = async(function(req, res) {
  let user = req.user;
  const userId = user._id;

  let personalBalance;
  if (user.personalAddress) {
    personalBalance = await(rippledServer.getBalance(user.personalAddress));
  }
  res.send({
    cashRegister: user.cashRegister,
    wallets: user.wallets,
    screenName: user.screenName,
    personalAddress: user.personalAddress,
    personalBalance: personalBalance
  });
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
// add all the validations for email, password, screenName later.
exports.signup = async(function(req, res, next) {
  let email = req.body.email;
  let password = req.body.password;
  let screenName = req.body.screenName;
  
  let passwordValidationFailures = await(passwordValidator.validatePassword(password));

  if (passwordValidationFailures) {
    return res.status(422).json({ error: passwordValidationFailures });
  }

  if (!email || !password || !screenName) {
    return res.status(422).json({error: "You must provide an email, password & screen name"});
  }

  const unlockEmail = await(Lock.lock(Lock.LOCK_PREFIX.EMAIL, email));
  const unlockScreenName = await(Lock.lock(Lock.LOCK_PREFIX.SCREEN_NAME, screenName));

  try {
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
  }
  finally {
    unlockEmail();
    unlockScreenName();
  }
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
