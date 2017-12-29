const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt-nodejs');
const async = require('async');
//UNCOMMENT THIS WHEN TRYING TO POPULATE THE BANK
// mongoose.Promise = global.Promise;

// const bodyParser = require('body-parser');
// var app = express();
//
// var router = require('../services/router');
//
// mongoose.connect('mongodb://localhost:introToAuth/introToAuth');
//
// app.use(morgan('combined'));
// app.use(bodyParser.json());
// app.use('/v1', router);
// // app.disable('etag');
//
// var PORT = process.env.PORT || 3000;
// var HOST = process.env.HOST || '127.0.0.1';
//
// console.log('Listening on', HOST, PORT);
// app.listen(PORT, HOST);


let vault = new Schema({
  address: {
    type: String
  },
  secret: {
    type: String
  },
  balance: {
    type: String
  }
});

let cashRegisterSchema = new Schema({
  address: {
    type: String
  },
  secret: {
    type: String
  },
  balance: {
    type: String
  }
});

let usedWalletSchema = new Schema ({
  wallet: {
    type: String
  }
})

let moneySchema = new Schema ({
  cost: {
    type: Number,
    default: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  profit: {
    type: Number,
    default: 0
  }
})

vault.pre('save', function (next) {
  var register = this;
  if (register.isNew || register.isModified('password')) {
    bcrypt.genSalt(10, function (err, salt) {
      if (err) { return next(err); }
      bcrypt.hash(register.secret, salt, null, function (err, hash) {
        if (err) { return next(err); }
        register.secret = hash;
        next();
      });
    });
  } else {
    next();
  }
});

cashRegisterSchema.pre('save', function (next) {
  var register = this;
  if (register.isNew || register.isModified('password')) {
    bcrypt.genSalt(10, function (err, salt) {
      if (err) { return next(err); }
      bcrypt.hash(register.secret, salt, null, function (err, hash) {
        if (err) { return next(err); }
        register.secret = hash;
        next();
      });
    });
  } else {
    next();
  }
});


// CLEAR YOUR MODELS AND RUN THIS AND YOU WILL HAVE ALL REGISTER AND BANK WITH UPDATED BALANCE VALUES.


exports.CashRegister = mongoose.model('cashRegister', cashRegisterSchema);
exports.Bank = mongoose.model('vault', vault);
exports.UsedWallet = mongoose.model('usedWallet', usedWalletSchema );
exports.Money = mongoose.model('money', moneySchema);
