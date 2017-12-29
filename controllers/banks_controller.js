const User = require('../models/user');
const {CashRegister} = require('../models/populateBank');
const {Bank} = require('../models/populateBank');
const {Money} = require('../models/populateBank');
const Redis = require('../models/redis');
const async = require('async');
let asynchronous = require('asyncawait/async');
let await = require('asyncawait/await');
const Encryption = require('../services/encryption');
const Decryption = require('../services/decryption');


let encryptedAddresses, encryptedBank;
if (process.env.NODE_ENV=='production') {
  encryptedAddresses = JSON.parse(process.env.REGISTERS);
  encryptedBank = JSON.parse(process.env.BANK);
} else {
  encryptedAddresses = require('./addresses').encryptedAddresses;
  encryptedBank = require('./addresses').encryptedBank;
}

exports.BANK_NAME = "ripplePay";

exports.inBankSend = asynchronous(function(req, res, next){
  let {receiverScreenName, amount} = req.body;
  let sender = req.user;
  let sender_id = sender._id;
  if ( amount > sender.balance )
  {
    return res.json({message: "Balance Insufficient", balance: sender.balance});
  }
  let receiver = await (User.findOne({ screenName: receiverScreenName}));
  if ( sender && receiver )
  {
    let trTime = new Date;
    let senderBal = {
      balance: sender.balance - amount
    };
    let senderTransaction = {
      date: trTime,
      amount: -amount,
      otherParty: receiver.screenName
    };
    let receiverBal = {
      balance: receiver.balance + amount
    };
    let receiverTransaction = {
      date: trTime,
      amount: amount,
      otherParty: sender.screenName
    };
    await (User.update({_id: sender_id}, {'$set': senderBal, '$push': {transactions: senderTransaction}}));
    await (User.findOneAndUpdate({ screenName: receiverScreenName }, {'$set': receiverBal, '$push': {transactions: receiverTransaction}}));
    res.json({message: "Payment was Successful", balance: senderBal.balance});
  }
  else
  {
    res.json({message: "Payment Unsuccessful"});
  }
})

exports.preparePayment = asynchronous(function(req, res, next) {
  const Ripple = require('../services/rippleAPI');
  let { amount, fromAddress, toAddress, sourceTag, toDesTag } = req.body;
  let existingUser = req.user;
  let userId = existingUser._id;
  if (amount > existingUser.balance) {
    res.json({ message: "Balance Insufficient" });
    return;
  }
  const txnInfo = await(Ripple.getTransactionInfo(fromAddress, toAddress, amount, sourceTag, toDesTag, userId));
  const fee = txnInfo.instructions.fee;
  res.json({
    fee: txnInfo.instructions.fee
  });
})

exports.signAndSend = asynchronous (function(req, res, next){
  const Ripple = require('../services/rippleAPI');
  const { fromAddress, amount } = req.body;

  const existingUser = req.user;
  const userId = existingUser._id;
  const bankAddress = Object.keys(bank)[0];

  const registerAddress = fromAddress;
  const registerBalance = await(Ripple.getBalance(registerAddress));

  const masterKey = await(Decryption.getMasterKey());
  
  let sendMoney = asynchronous (function(){
    const encryptedRegisterAddress = Encryption.encrypt(masterKey, registerAddress);
    const encryptedRegisterSecret = encryptedAddresses[encryptedRegisterAddress];
    const registerSecret = Decryption.decrypt(masterKey, encryptedRegisterSecret);
    const result = await(Ripple.signAndSend(registerAddress, registerSecret, userId));
    if (result) {
      console.log(result);
      res.json({message: result.resultCode});
    }
    else {
      res.json({message: "Transaction Failed"});
    }
  })

  let refillCashRegisterAndSend = asynchronous(function(){
    const encryptedBankAddress = Encryption.encrypt(masterKey, bankAddress);
    const encryptedBankSecret = encryptedBank[encryptedBankAddress];
    const bankSecret = Decryption.decrypt(masterKey, encryptedBankSecret);
    // refilling by 20 for now until we find a better wallet refill algorithm
    const txnInfo = await(Ripple.getTransactionInfo(bankAddress, registerAddress, 20, 0, null, null));
    const result = await(Ripple.signAndSend(bankAddress, bankSecret, exports.BANK_NAME, txnInfo));
    console.log(result);
    sendMoney();
  })

  const amountToSend = amount;

  if ( registerBalance - amountToSend < 20 ) {
    refillCashRegisterAndSend();
  } else {
    sendMoney();
  }
})

// Address and Destination/Source Tag used to get user's transactions and balance
// Last Transaction ID is the stopping point at which new balance is created.
// Last Transaction ID is reset to the first transaction ID that matches
// A user's address and destination tag
exports.getTransactions = asynchronous(function (req, res, next) {
  const Ripple = require('../services/rippleAPI');
  const existingUser = req.user;
  const userId = existingUser._id;
  if (existingUser.cashRegister)
  {
    const registerBalance = await (Ripple.getBalance(existingUser.cashRegister));
    await (CashRegister.findOneAndUpdate({ address: existingUser.cashRegister }, { balance: registerBalance }, {upsert: false}));
    const transactions = await (Ripple.getSuccessfulTransactions(existingUser.cashRegister));
    // console.log(txnInfo);
    let userObject = {
      _id: existingUser._id,
      balance: existingUser.balance,
      transactions: existingUser.transactions,
      lastTransactionId: null
    };

    let userWallets = existingUser.wallets;
    const userAddress = existingUser.cashRegister;

    const processTransaction = function(currTxn, setLastTransaction, stopIteration) {
      if(
        userWallets.includes(currTxn.specification.destination.tag) || 
        userWallets.includes(currTxn.specification.source.tag)
      ) {
        if ( setLastTransaction )
        {
          userObject.lastTransactionId = currTxn.id;
          setLastTransaction = false;
        }
        if (currTxn.id === existingUser.lastTransactionId) {
          stopIteration = true;
          return [setLastTransaction, stopIteration];
        }
          let counterParty;
          //This only has to look at 2 keys, so It is ok that it is using forEach. It won't be that blocking.
          Object.keys(currTxn.outcome.balanceChanges).forEach((addr) => {
            if (userAddress !== addr) {
              counterParty = addr;
              return;
            }
          });
          const balance = currTxn.outcome.balanceChanges[userAddress][0].value;
          let balanceChange = parseFloat(balance.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0]);
          if ( balanceChange < 0 )
          {
            balanceChange -= 0.02;
          }
          userObject.balance += balanceChange;
          let newTxn = {
            date: new Date(currTxn.outcome.timestamp),
            amount: balanceChange,
            txnId: currTxn.id,
            otherParty: counterParty
          };
          userObject.transactions.unshift(newTxn);
      }
      return [setLastTransaction, stopIteration];
    };
    // map over transactions asynchronously
    let setLastTransaction = true;
    let stopIteration = false;
    // Stop at a user's last transaction ID and reset the last TID.
    async.mapSeries(transactions, function (currTxn, cb) {
      [setLastTransaction, stopIteration] = processTransaction(currTxn, setLastTransaction, stopIteration);
      if ( !stopIteration )
      {
        cb(null, currTxn);
      }
      else {
        cb(true)
      }
    }, function(error, resp) {
      //SORTING INSIDE OF THE SERVER IS BLOCKING INSTEAD THE SORTING IS DONE IN HOME.JS CLIENT-SIDE
      User.update({_id: existingUser._id}, userObject, function (err) {
        if (err) { return next(err); }
        res.json({
          transactions: userObject.transactions,
          balance: userObject.balance
        });
      });
    });
  }
  else
  {
    res.json({
      transactions: existingUser.transactions,
      balance: existingUser.balance
    });
  }
})
