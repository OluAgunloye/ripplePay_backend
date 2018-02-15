let _ = require('lodash');
const User = require('../models/user');
const { CashRegister } = require('../models/moneyStorage');
const { BankWallet } = require('../models/bankWallet');
const Lock = require('../services/lock');
const async = require('async');
let asynchronous = require('asyncawait/async');
let await = require('asyncawait/await');
const Config = require('../config_enums');
const RippledServer = require('../services/rippleAPI');
const rippledServer = new RippledServer();

//Since there is a very low chance of a coincide, this shouldn't have to recurse at all
//or more than once ever.
// DestTags are in 32 bits/

function createBankWalletId(address, destTag) {
  return `bankWalletId-${address}${destTag}`;
}
exports.generateDestTag = asynchronous(function(req, res, next){
  const user = req.user;
  const userId = user._id;
  const cashRegister = user.cashRegister;
  if (!cashRegister) {
    return res.json({ message: "Error Occurred"});
  }
  const userWallets = await (BankWallet.find({ userId: userId, address: user.cashRegister }, { destTag: 1 }));
  if (userWallets.length === 5) {
    return res.json({ message: "maximum 5 wallets" });
  }
  const newTag = _.random(Config.MIN_DEST_TAG, Config.MAX_DEST_TAG);
  const bankWalletId = createBankWalletId(cashRegister, newTag);

  const unlockBankWallet = await(Lock.lock(Lock.LOCK_PREFIX.BANK_WALLET, bankWalletId));
  // const newTag = 2639774077;
  try {
    const newBankWallet = new BankWallet({
      userId: userId,
      bankWalletId: bankWalletId,
      address: cashRegister,
      destTag: newTag,
      createdAt: Date.now()
    })
    newBankWallet.save(function(err) {
      if (err) {
        return next(err);
      }
      res.json({ destinationTag: newTag });
    })
  }
  finally {
    unlockBankWallet();
  }
});

exports.deleteWallet = asynchronous(function(req, res, next){
  let { desTag } = req.body;
  const user = req.user;
  const userId = user._id;
  if (!user.cashRegister || !desTag) {
    return res.json({ message: "Error Occured" });
  }
  const bankWalletId = createBankWalletId(user.cashRegister, desTag);

  const unlockBankWallet = await(Lock.lock(Lock.LOCK_PREFIX.BANK_WALLET, bankWalletId));
  try {
    await (BankWallet.findOneAndRemove({ bankWalletId }));
    res.json({});
  } 
  finally {
    unlockBankWallet();
  }
})

exports.generateRegister = asynchronous(function(req, res, next){
  const existingUser = req.user;
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
