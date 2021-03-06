const async = require('async');
let asynchronous = require('asyncawait/async');
let await = require('asyncawait/await');
const User = require('../models/user');
const UserMethods = require('../models/methods/user');
const { CashRegister, Money } = require('../models/moneyStorage');
const { Transaction } = require('../models/transaction');
const Encryption = require('../services/encryption');
const Decryption = require('../services/decryption');
const BanksValidation = require('../validations/banks_validation');
const Lock = require('../services/lock');
const Config = require('../config_enums');
const RippledServer = require('../services/rippleAPI');
const rippledServer = new RippledServer();

let encryptedAddresses, encryptedBank;
if (process.env.NODE_ENV=='production') {
  encryptedAddresses = JSON.parse(process.env.REGISTERS);
  encryptedBank = JSON.parse(process.env.BANK);
} else {
  encryptedAddresses = require('../configs/addresses').encryptedAddresses;
  encryptedBank = require('../configs/addresses').encryptedBank;
}

exports.inBankSend = asynchronous(function(req, res, next){
  let { receiverScreenName, amount } = req.body;
  let sender = req.user;
  let receiver = await (UserMethods.findByScreenName(receiverScreenName));

  const validationErrors = BanksValidation.inBankSendValidations(receiverScreenName, amount, sender, receiver);
  if (validationErrors.length > 0) {
    return res.status(422).json({ error: validationErrors });
  }
  
  const senderId = sender._id;
  const receiverId = receiver._id;
  amount = parseFloat(amount);

  const unlockSender = await(Lock.lock(Lock.LOCK_PREFIX.USER_ID, senderId));
  const unlockReceiver = await(Lock.lock(Lock.LOCK_PREFIX.USER_ID, receiverId));

  try {
      let trTime = new Date().getTime();
  
      let senderTransaction = new Transaction({
        userId: senderId,
        date: trTime,
        amount: -amount,
        otherParty: receiver.screenName
      });
  
      let receiverTransaction = new Transaction({
        userId: receiverId,
        date: trTime,
        amount: amount,
        otherParty: sender.screenName
      });

      await(UserMethods.decreaseBalance(senderId, amount));
      await(UserMethods.increaseBalance(receiverId, amount));
  
      senderTransaction.save(function(err) {
        if (err) {
          console.log(err, "saving sender transaction failed!");
        }
      });
      receiverTransaction.save(function(err) {
        if (err) {
          console.log(err, "saving receiver transaction failed!");
        }
      });

      res.json({message: "Payment was Successful", balance: sender.balance - amount});
      
  }
  finally {
    unlockSender();
    unlockReceiver();
  }

})

exports.preparePayment = asynchronous(function(req, res, next) {
  let { amount, fromAddress, toAddress, sourceTag, toDesTag } = req.body;
  
  let existingUser = req.user;
  let userId = existingUser._id;

  const masterKey = await(Decryption.getMasterKey());
  const ripplePayAddresses = Decryption.decryptAllAddresses(masterKey, encryptedAddresses);
  
  const validationErrors = BanksValidation.preparePaymentValidations(amount, fromAddress, toAddress, sourceTag, toDesTag, existingUser, ripplePayAddresses);
  if (validationErrors.length > 0) {
    return res.status(422).json({ error: validationErrors })
  }

  amount = parseFloat(amount);
  
  const txnInfo = await(rippledServer.prepareTransaction(fromAddress, toAddress, amount, sourceTag, toDesTag, userId));
  const fee = parseFloat(txnInfo.instructions.fee);
  return res.json({ fee });
})

exports.signAndSend = asynchronous (function(req, res, next){
  let { fromAddress, amount } = req.body;
  const existingUser = req.user;
  const userId = existingUser._id;
  const registerAddress = fromAddress;
  const registerBalance = await(rippledServer.getBalance(registerAddress));

  const validationErrors = BanksValidation.signAndSendValidations(amount, registerAddress, registerBalance, existingUser);
  if (validationErrors.length > 0) {
    return res.status(422).json({ error: validationErrors })
  }

  amount = parseFloat(amount);
  const masterKey = await(Decryption.getMasterKey());
  
  const encryptedRegisterAddress = Encryption.encrypt(masterKey, registerAddress);
  const encryptedRegisterSecret = encryptedAddresses[encryptedRegisterAddress];
  const registerSecret = Decryption.decrypt(masterKey, encryptedRegisterSecret);

  const result = await(rippledServer.signAndSend(registerAddress, registerSecret, userId));
  if (result) {
    res.json({message: result.resultCode});
  }
  else {
    res.json({message: "Transaction Failed"});
  }
})

// Address and Destination/Source Tag used to get user's transactions and balance
// Last Transaction ID is the stopping point at which new balance is created.
// Last Transaction ID is reset to the first transaction ID that matches
// A user's address and destination tag
exports.getTransactions = asynchronous(function (req, res, next) {
  const existingUser = req.user;
  const userId = existingUser._id;
  const cashRegister = existingUser.cashRegister;
  let userWallets = await(UserMethods.getWallets(userId, cashRegister));
  let userTransactions = [];

  if (!userId) {
    return next("Fatal error");
  }
  if (!existingUser.cashRegister) {
    userTransactions = await(UserMethods.getTransactions(userId));
    return res.json({
      transactions: userTransactions,
      balance: existingUser.balance
    });
  }
  const unlockUser = await(Lock.lock(Lock.LOCK_PREFIX.USER_ID, userId));

  try {

      const registerBalance = await (rippledServer.getBalance(existingUser.cashRegister));
      const transactions = await (rippledServer.getTransactions(existingUser.cashRegister));
      CashRegister.findOneAndUpdate({ address: existingUser.cashRegister }, { balance: registerBalance }, {upsert: false}, function(err, doc) {
        if (err) {
          console.log(err, "updating cash register failed!");
        }
      });
      // console.log(txnInfo);
      let userChanges = {
        balance: 0,
        lastTransactionId: null
      };
  
      const processTransaction = function(currTxn, setLastTransaction, stopIteration) {
  
        const destAddress = currTxn.specification.destination.address;
        const destTag = currTxn.specification.destination.tag;
        const sourceAddress = currTxn.specification.source.address;
        const sourceTag = currTxn.specification.source.tag;
        const destTagIdx = userWallets.indexOf(destTag);
        const sourceTagIdx = userWallets.indexOf(sourceTag);
  
        if ( (destTagIdx !== -1 && destAddress === cashRegister) || (sourceTagIdx !== -1 && sourceAddress === cashRegister) ) {
          if ( setLastTransaction )
          {
            userChanges.lastTransactionId = currTxn.id;
            setLastTransaction = false;
          }
          if (currTxn.id === existingUser.lastTransactionId) {
            stopIteration = true;
            return [setLastTransaction, stopIteration];
          }
  
          let counterParty, tag, counterPartyTag;
  
          if (destAddress === cashRegister) {
            counterParty = sourceAddress;
            counterPartyTag = sourceTag;
            tag = destTag;
          } else {
            counterParty = destAddress;
            counterPartyTag = destTag;
            tag = sourceTag;
          }
  
          let balanceChange = parseFloat(currTxn.outcome.balanceChanges[cashRegister][0].value);
  
          if ( balanceChange < 0 && currTxn.outcome.result === "tesSUCCESS")
          {
            // ripplePay fee for outgoing txn
            balanceChange -= Config.ripplePayFee;
            const fee = parseFloat(currTxn.outcome.fee);
  
            Money.update({}, { '$inc': { cost: fee, revenue: Config.ripplePayFee + fee, profit: Config.ripplePayFee } }, function (err, doc) {
              if (err) {
                console.log(err, "error updating money!");
              }
            });  
          }
          // apply ripple ledger fee
          userChanges.balance += balanceChange;
          // add to user transactions only if its a successful transaction
          if (currTxn.outcome.result === "tesSUCCESS") {
            let newTxn = new Transaction({
              txnId: currTxn.id,
              userId: userId,
              tag: tag,
              date: new Date(currTxn.outcome.timestamp).getTime(),
              amount: balanceChange,
              otherParty: counterParty,
              otherPartyTag: counterPartyTag
            });
            newTxn.save(function(err) {
              if (err) {
                console.log(err, "saving new transaction failed!");
              }
            });
          }
        }
        return [setLastTransaction, stopIteration];
      };
      // map over transactions asynchronously
      let setLastTransaction = true;
      let stopIteration = false;
      // Stop at a user's last transaction ID and reset the last TID.
      async.mapSeries(transactions, asynchronous(function (currTxn, cb) {
        [setLastTransaction, stopIteration] = processTransaction(currTxn, setLastTransaction, stopIteration);
        if ( !stopIteration )
        {
          cb(null, currTxn);
        }
        else {
          cb(true)
        }
      }), function(error, resp) {
        userTransactions = await(UserMethods.getTransactions(userId));
        let updatedUser = await(
          User.findOneAndUpdate(
            {_id: existingUser._id}, 
            {'$set': { lastTransactionId: userChanges.lastTransactionId }, '$inc': { balance: userChanges.balance }}
          )
        );
        res.json({
          transactions: userTransactions,
          balance: existingUser.balance + userChanges.balance
        });
      });
  }

  finally {    
    unlockUser();
  }
})

exports.loadNextTransactions = asynchronous(function(req, res, next) {
  const user = req.user;
  const userId = user._id;
  const maxDate = req.query[0];

  let nextTransactions = await(UserMethods.getTransactionsBeforeDate(userId, maxDate));

  const shouldLoadMoreTransactions = nextTransactions.length >= Config.TXN_LIMIT ? true : false;
  res.json({ nextTransactions, shouldLoadMoreTransactions });
});