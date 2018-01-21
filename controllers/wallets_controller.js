const User = require('../models/user');
const { UsedWallet, CashRegister } = require('../models/moneyStorage');
const async = require('async');
let asynchronous = require('asyncawait/async');
let await = require('asyncawait/await');
let _ = require('lodash');
const RippledServer = require('../services/rippleAPI');
const rippledServer = new RippledServer();

//Since there is a very low chance of a coincide, this shouldn't have to recurse at all
//or more than once ever.
// DesTags are in 32 bits/
exports.receiveOnlyDesTag = function(req, res, next){
  let {cashRegister} = req.body;
  let userId = req.user._id
  let newTag;
  let uniqueWallet;
  let genTagRecursion = asynchronous (function(){
      newTag = _.random(1, 4294967294);
      uniqueWallet = `${cashRegister}${newTag}`;
      let existingWallet = await (UsedWallet.findOne({ wallet: uniqueWallet }));
      if ( existingWallet )
      {
        // console.log("same address and dest tag not allowed for two people!");
        genTagRecursion();
      }
      else
      {
        let theNewWallet = new UsedWallet({ wallet: uniqueWallet });
        await (theNewWallet.save());
        await (User.update({_id: userId}, {'$push': {wallets: newTag}}));
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
  await (User.update({ _id: userId }, {'$pull': { wallets: desTag }}));
  await (UsedWallet.findOneAndRemove({ wallet: findthiswallet }));
  res.json({});
})

exports.findOldAddress = asynchronous(function(req, res, next){
  let existingUser = req.user;
  let userId = existingUser._id;
  res.json({cashRegister: existingUser.cashRegister});
});

exports.generateRegister = asynchronous(function(req, res, next){
  const existingUser = req.user;
  if (existingUser.wallets.length === 5) {
    return res.json({message: "maximum 5 wallets"});
  }
  if (existingUser.cashRegister) {
    return res.json({ message: "user already has a cash register" })
  }
  const userId = existingUser._id;
  const cashRegisters = await(CashRegister.find().sort({ balance: 1 }));

  const minBalanceRegister = cashRegisters[0].address;

  User.update({ _id: existingUser._id }, { cashRegister: minBalanceRegister },
    function (err) {
      if (err) { return next(err); }
      res.json({
        cashRegister: minBalanceRegister
      });
    });
});

exports.receiveAllWallets = asynchronous(function(req, res, next){
  let existingUser = req.user;
  let userId = existingUser._id;
  res.json({wallets: existingUser.wallets});
})
