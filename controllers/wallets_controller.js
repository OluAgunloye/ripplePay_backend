let _ = require('lodash');
const User = require('../models/user');
const UserMethods = require('../models/methods/user');
const { CashRegister } = require('../models/moneyStorage');
const { BankWallet } = require('../models/bankWallet');
const WalletValidation = require('../validations/wallets_validation');
const WalletMethods = require('../models/methods/cashRegister');
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
  
  const validationError = await(WalletValidation.generateDestTagValidations(userId, cashRegister));
  if (validationError) {
    return res.status(422).json({ error: validationError });
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

  const validationErrors = await(WalletValidation.deleteWalletValidations(user.cashRegister, desTag));
  if (validationErrors.length > 0) {
    return res.status(422).json({ error: validationErrors });
  }

  const bankWalletId = createBankWalletId(user.cashRegister, desTag);

  const unlockBankWallet = await(Lock.lock(Lock.LOCK_PREFIX.BANK_WALLET, bankWalletId));
  
  try {
    await(UserMethods.removeWallet(bankWalletId));
    res.json({});
  } 
  finally {
    unlockBankWallet();
  }
})

exports.generateRegister = asynchronous(function(req, res, next){
  const existingUser = req.user;
  const userId = existingUser._id;
  const cashRegister = existingUser.cashRegister;

  const validationError = await(WalletValidation.generateRegisterValidations(userId, cashRegister));
  if (validationError) {
    return res.status(422).json({ error: validationError });
  }

  const minBalanceRegister = await(WalletMethods.getMinBalanceCashRegister());

  User.update({ _id: existingUser._id }, { cashRegister: minBalanceRegister },
    function (err) {
      if (err) { return next(err); }
      res.json({
        cashRegister: minBalanceRegister
      });
    });
});
