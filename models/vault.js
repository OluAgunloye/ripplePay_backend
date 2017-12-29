const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt-nodejs');
const { bank } = require('../controllers/addresses');

// const getBalance = require('../controllers/rippleAPI');
// var app = express();

// var router = require('../services/router');

// mongoose.connect('mongodb://localhost:introToAuth/introToAuth');

// app.use(morgan('combined'));
// app.use(bodyParser.json());
// app.use('/v1', router);
// // app.disable('etag');

// var PORT = process.env.PORT || 3000;
// var HOST = process.env.HOST || '127.0.0.1';

// console.log('Listening on', HOST, PORT);
// app.listen(PORT, HOST);
// mongoose.Promise = global.Promise;


let vault = new Schema({
  address: {
    type: String
  },
  secret: {
    type: String
  }
});

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

// bank.forEach((a) => {
//   let Vault = mongoose.model('vault', vault);
//   let myVault = new Vault(a);
//   myVault.save(function (err) {
//     if (err) { console.log('did not work'); }
//   });
// });

// bcrypt.compare('ss9N6t4MSiHi269VNv5G9QVhY51RA', '$2a$10$HQ.3ppQCYj8lq5sSPgD5eeJV3KyHJldlLvDBWX66.Z.detW0Q2nfi', function (err, res) {
//   console.log(res);
// });

//Do this to connect our database to the ripple server
// mongoose.model('vault', vault).findOne({ address: 'r9bxkP88S17EudmfbgdZsegEaaM76pHiW6'}).then((v) => {
//   console.log(v, 'test');
//   console.log(getBalance(v.address));
// });

// module.exports = mongoose.model('vault', vault);
