const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt-nodejs');
const { addresses, bank } = require('../controllers/addresses');
const async = require('async');
const {CashRegister} = require('./populateBank');
const {Bank} = require('./populateBank');
const {Money} = require('./populateBank');
const {ShapeShiftTransaction} = require('./shapeShiftTransaction');

mongoose.Promise = global.Promise;

var router = require('../services/router');

if (process.env.NODE_ENV == 'production') {
  mongoose.connect(process.env.MONGO_URL);
} else {
  mongoose.connect('mongodb://localhost:ripplePay/ripplePay');
}

mongoose.connection.once('connected', () => {
    mongoose.connection.db.dropCollection('vaults');
    mongoose.connection.db.dropCollection('cashregisters');
    mongoose.connection.db.dropCollection('money');
    //The following will create several B-trees with MongoDB and will help our database scale and helps make search in logn time
    mongoose.connection.db.collection("cashregisters").createIndex({address: 1}, {background: true});
  mongoose.connection.db.collection("shapeshifttransactions").createIndex({ userId: 1, shapeShiftAddress: 1, date: 1}, {background: true});
    mongoose.connection.db.collection("users").createIndex({screenName: 1}, {background: true});
    mongoose.connection.db.collection("users").createIndex({email: 1}, {background: true});
    mongoose.connection.db.collection("usedwallets").createIndex({wallet: 1}, {background: true});
});
const Rippled = require('../controllers/rippleAPI');
let server = new Rippled();
let adds = Object.keys(addresses);

// server.getBalance(addresses[0].address);
server.connect().then(()=>{
  let recurse = function(n = 0){

    //This is a recursive function that will help to save all of the balances of our cash Registers.
    //5 is the length of the number of cash registers we have so when this increases, just increase it.
    if ( n === 5 )
    {
      return;
    }
    server.api.getBalances(adds[n]).then((info) => {
      let Register = CashRegister;
      let addon = {
        address: adds[n],
        secret: addresses[adds[n]],
        balance: info[0].value
      };
      let myCashRegister = new Register(addon);
      myCashRegister.save(function (err) {
        if (err) { console.log('did not work'); }
        return recurse(n + 1);
      });
    });
  }
  recurse();
  let x = Object.keys(bank);
  server.api.getBalances(x[0]).then((info) => {
    let savebank = {
      address: x[0],
      secret: bank[x[0]],
      balance: info[0].value
    };
    let Vault = Bank;
    let myVault = new Vault(savebank);
    myVault.save(function (err) {
      if (err) { console.log('did not work'); }
    });
  });
});

let cash = new Money;
cash.save(function(err){

});
let shapeShiftTransaction = new ShapeShiftTransaction;
shapeShiftTransaction.save(function(err){

});