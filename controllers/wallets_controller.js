const User = require('../models/user');
const {UsedWallet} = require('../models/populateBank');
const Redis = require('../models/redis');
const async = require('async');
let asynchronous = require('asyncawait/async');
let await = require('asyncawait/await');

let addresses, bank;

if (process.env.NODE_ENV == 'production') {
  addresses = JSON.parse(process.env.REGISTERS);
  bank = JSON.parse(process.env.BANK);
} else {
  addresses = require('./addresses').addresses;
  bank = require('./addresses').bank;
}

//Since there is a very low chance of a coincide, this shouldn't have to recurse at all
//or more than once ever.
// DesTags are in 32 bits/
exports.receiveOnlyDesTag = function(req, res, next){
  let {cashRegister} = req.body;
  let userId = req.user._id
  let newTag;
  let findthis;
  let genTagRecursion = asynchronous (function(){
      newTag = parseInt(Math.floor(Math.random()*4294967294));
      findthis = `${cashRegister}${newTag}`;
      let existingWallet = await (UsedWallet.findOne({wallet: findthis}));
      if ( existingWallet )
      {
        // console.log("same address and dest tag not allowed");
        genTagRecursion();
      }
      else
      {
        let theNewWallet = new UsedWallet({wallet: findthis});
        await (theNewWallet.save());
        await (User.update({_id: userId}, {'$push': {wallets: newTag}}));
        Redis.findFromAndUpdateCache("redis-wallets", userId, (val) => val.push(newTag));
        res.json({ destinationTag: newTag });
      }
    }
  )
  genTagRecursion();
}

exports.deleteWallet = asynchronous(function(req, res, next){
  let { desTag, cashRegister} = req.body;
  let userId = req.user._id;
  let findthiswallet = `${cashRegister}${desTag}`;
  Redis.findFromAndUpdateCache("redis-wallets", userId, (val) => val.shift());
  await (User.update({ _id: userId }, {'$pull': {wallets: desTag}}));
  await (UsedWallet.findOneAndRemove({wallet: findthiswallet}));
  res.json({});
})

exports.findOldAddress = asynchronous(function(req, res, next){
  let existingUser = req.user;
  let userId = existingUser._id;
  let cacheVal = await (Redis.getFromTheCache("redis-cash-register", userId));
  if (cacheVal) {
    return res.json({cashRegister: cacheVal});
  }
  else if (cacheVal === 'none') {
    return res.json({cashRegister: undefined});
  }
  Redis.setInCache("redis-cash-register", userId, existingUser.cashRegister);
  res.json({cashRegister: existingUser.cashRegister});
})

exports.generateRegister = asynchronous(function(req, res, next){
  let adds = Object.keys(addresses).slice(0,5);
  const Ripple = require('../services/rippleAPI');
  let existingUser = req.user;
  let userId = existingUser._id;

  let registers = [];
  let minAddr;
  let newBal;

  async.mapSeries(adds, asynchronous(function(address, cb){
    const balance = await(Ripple.getBalance(address));
    registers.push({ address, balance })
    cb(null, address);
  }),
  function(error, resp){
    //THIS SORT IS THREADSAFE and NON-BLOCKING
    async.sortBy(registers, function(register, cb){
      cb(null, register.balance);
    },function(err, sortedRegisters){
      let assignedRegister = sortedRegisters[Math.floor(registers.length/2)].address;
      User.update({_id: existingUser._id}, {cashRegister: assignedRegister},
        function (err) {
          if (err) { return next(err); }
          Redis.findFromAndUpdateCache("redis-cash-register", userId, null, assignedRegister);
          res.json({
            cashRegister: assignedRegister
          });
        });
      })
  })
})

exports.receiveAllWallets = asynchronous(function(req, res, next){
  let existingUser = req.user;
  let userId = existingUser._id;
  let cacheVal = await (Redis.getFromTheCache("redis-wallets", userId));
  if (cacheVal) {
    res.json({wallets: cacheVal});
    return;
  }
  Redis.setInCache("redis-wallets", userId, existingUser.wallets)
  res.json({wallets: existingUser.wallets});
})

exports.removeCashRegister = function(req, res, next){
  let userId = req.user._id;
  User.findOneAndUpdate({_id: userId }, {cashRegister: undefined}, function(err){
    if (err) {
      return next(err);
    }
    Redis.findFromAndUpdateCache("redis-cash-register", userId, null, 'none');
    res.json({});
  })
}
