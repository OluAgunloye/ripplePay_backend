const User = require('../models/user');
const {UsedWallet} = require('../models/populateBank');
const { findFromAndUpdateCache, getFromTheCache, setInCache } = require('../models/redis');
const async = require('async');
let asynchronous = require('asyncawait/async');
let await = require('asyncawait/await');

let addresses, bank;

if (process.env.NODE_ENV == 'production') {
  addresses = JSON.parse(process.env.REGISTERS);
  bank = JSON.parse(process.env.BANK);
  console.log(addresses, bank);
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
        await (User.update({_id: userId}, {$push: {wallets: newTag}}));
        findFromAndUpdateCache(`${userId}: redis-wallets`, (val) => val.push(newTag));
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
  findFromAndUpdateCache(`${userId}: redis-wallets`, (val) => val.shift());
  await (User.update({ _id: userId }, {$pull: {wallets: desTag}}));
  await (UsedWallet.findOneAndRemove({wallet: findthiswallet}));
  res.json({});
})

exports.findOldAddress = asynchronous(function(req, res, next){
  let existingUser = req.user;
  let userId = existingUser._id;
  let cacheVal = await (getFromTheCache(`${userId}: redis-cash-register`));
  if (cacheVal) {
    return res.json({cashRegister: cacheVal});
  }
  else if (cacheVal === 'none') {
    return res.json({cashRegister: undefined});
  }
  setInCache(`${userId}: redis-cash-register`, existingUser.cashRegister);
  res.json({cashRegister: existingUser.cashRegister});
})

exports.generateRegister = asynchronous(function(req, res, next){
  let adds = Object.keys(addresses).slice(0,5);
  const Rippled = require('./rippleAPI');
  let server = new Rippled();
  let existingUser = req.user;
  let userId = existingUser._id;
  await (server.connect());
  let allbals = [];
  let minAddr;
  let newBal;
  async.mapSeries(adds, function(addr, cb){
    server.api.getBalances(addr).then((info) => {
      allbals.push([parseFloat(info[0].value), addr]);
      cb(null, addr);
    })
  },
  function(error, resp){
    //THIS SORT IS THREADSAFE and NON-BLOCKING
    async.sortBy(allbals, function(single, cb){
      cb(null, single[0]);
    },function(err, respo){
      let newregister = respo[Math.floor(allbals.length/2)][1];
      User.update({_id: existingUser._id}, {cashRegister: newregister},
        function (err) {
          if (err) { return next(err); }
          findFromAndUpdateCache(`${userId}: redis-cash-register`, null, newregister);
          res.json({
            cashRegister: newregister
          });
        });
      })
  })
})

exports.receiveAllWallets = asynchronous(function(req, res, next){
  let existingUser = req.user;
  let userId = existingUser._id;
  let cacheVal = await (getFromTheCache(`${userId}: redis-wallets`));
  if (cacheVal) {
    res.json({wallets: cacheVal});
    return;
  }
  setInCache(`${userId}: redis-wallets`, existingUser.wallets)
  res.json({wallets: existingUser.wallets});
})

exports.removeCashRegister = function(req, res, next){
  let userId = req.user._id;
  User.findOneAndUpdate({_id: userId }, {cashRegister: undefined}, function(err){
    if (err) {
      return next(err);
    }
    findFromAndUpdateCache(`${userId}: redis-cash-register`, null, 'none');
    res.json({});
  })
}
