const User = require('../models/user');
const UserMethods = require('../models/methods/user');
const { BankWallet } = require('../models/bankWallet');
const { tokenForUser } = require('../services/token');
const async = require('asyncawait/async');
const await = require('asyncawait/await');
const Redis = require('../services/redis');
const passwordValidator = require('../services/passwordValidator');
const UserValidation = require('../validations/user_validation');
const Lock = require('../services/lock');
const RippledServer = require('../services/rippleAPI');
const rippledServer = new RippledServer();

exports.signin = async(function(req, res) {
  let user = req.user;
  const userId = user._id;

  let personalBalance;
  let userWallets = [];
  if (user.personalAddress) {
    personalBalance = await(rippledServer.getBalance(user.personalAddress));
  }
  if (user.cashRegister) {
    userWallets = await(UserMethods.getWallets(userId, user.cashRegister));
  }
  res.send({
    cashRegister: user.cashRegister,
    screenName: user.screenName,
    personalAddress: user.personalAddress,
    wallets: userWallets,
    personalBalance: personalBalance
  });
});

exports.comparePassword = function(req, res, next) {
  const user = req.user;
  const { password } = req.body;

  const validationErrors = UserValidation.comparePasswordValidations(password);
  if (validationErrors.length > 0) {
    return res.status(422).json({ error: validationErrors })
  }

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
  let { email, password, screenName } = req.body;

  const validationErrors = await(UserValidation.signupValidations(email, password, screenName));
  if (validationErrors.length > 0) {
    return res.status(422).json({ error: validationErrors });
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
  
  const validationErrors = await(UserValidation.changePasswordValidations(oldPassword, newPassword));
  if (validationErrors.length > 0) {
    return res.status(422).json({ error: validationErrors });
  }

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

exports.search = async(function (req, res, next) {
  const currentUser = req.user;
  let query = req.query;
  let searchKey = Object.keys(query)[0];
  let searchString = query[searchKey];
  let validationErrors;

  if (searchString !== undefined) {
    validationErrors = UserValidation.searchValidations(searchString);
    if (validationErrors.length > 0) {
      return res.status(422).json({ error: validationErrors });
    }
  }

  const screenNames = await(UserMethods.searchUser(searchString, currentUser.screenName));
  res.json({ search: screenNames });
});
