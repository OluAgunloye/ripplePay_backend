const User = require('../models/user');
const { tokenForUser } = require('../services/token');

exports.signin = function(req, res) {
  let user = req.user;
  res.send({
    cashRegister: user.cashRegister,
    wallets: user.wallets,
    screenName: user.screenName
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

exports.signup = function(req, res, next) {
  let email = req.body.email;
  let password = req.body.password;
  let screenName = req.body.screenName;
  if (!email || !password || !screenName) {
    return res.status(422).json({error: "You must provide an email, password & screen name"});
  }

  User.findOne({email: email}, function(err, existingUser) {
    if (err) { return next(err) }
    if (existingUser) {return res.status(422).json({error: "Email taken"})}
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
};

exports.search = function (req, res, next) {
  const user = req.user;
  let item = req.query;
  let key = Object.keys(item)[0];
  let reg = new RegExp(`^${item[key]}\\w*$` , 'i');
  User.find({ "screenName": { "$regex": reg, "$ne": user.screenName } }, function(err, users) {
    if (err) { return next(err); }
    res.json({search: users.map((user) => user.screenName)});
  });
};
