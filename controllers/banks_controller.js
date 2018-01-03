const async = require('async');
let asynchronous = require('asyncawait/async');
let await = require('asyncawait/await');
const User = require('../models/user');
const { CashRegister, BANK_NAME } = require('../models/moneyStorage');
const { Transaction } = require('../models/transaction');
const Redis = require('../services/redis');
const Encryption = require('../services/encryption');
const Decryption = require('../services/decryption');
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
  let senderId = sender._id;
  if ( amount > sender.balance ) {
    return res.json({message: "Balance Insufficient", balance: sender.balance});
  }
  let receiver = await (User.findOne({ screenName: receiverScreenName}));
  let receiverId = receiver._id;
  if ( sender && receiver ) {
    let trTime = new Date;

    let senderBal = {
      balance: sender.balance - amount
    };

    let senderTransaction = new Transaction({
      userId: senderId,
      date: trTime,
      amount: -amount,
      otherParty: receiver.screenName
    });

    let receiverBal = {
      balance: receiver.balance + amount
    };

    let receiverTransaction = new Transaction({
      userId: receiverId,
      date: trTime,
      amount: amount,
      otherParty: sender.screenName
    });

    await (User.update({ _id: senderId}, { '$set': senderBal }));
    await (User.update({ _id: receiverId }, { '$set': receiverBal }));
    await (senderTransaction.save());
    await (receiverTransaction.save());

    res.json({message: "Payment was Successful", balance: senderBal.balance});
  }
  else {
    res.json({message: "Payment Unsuccessful"});
  }
})

exports.preparePayment = asynchronous(function(req, res, next) {
  let { amount, fromAddress, toAddress, sourceTag, toDesTag } = req.body;
  let existingUser = req.user;
  let userId = existingUser._id;
  if (amount > existingUser.balance) {
    res.json({ message: "Balance Insufficient" });
    return;
  }

  const masterKey = await(Decryption.getMasterKey());
  const ripplePayAddresses = Decryption.decryptAllAddresses(masterKey, encryptedAddresses);

  if (ripplePayAddresses.includes(toAddress)) {
    return res.json({ message: "Send with no fee to a ripplePay user!"});
  }

  const txnInfo = await(rippledServer.getTransactionInfo(fromAddress, toAddress, amount, sourceTag, toDesTag, userId));
  const fee = txnInfo.instructions.fee;
  res.json({
    fee: txnInfo.instructions.fee
  });
})

exports.signAndSend = asynchronous (function(req, res, next){
  const { fromAddress, amount } = req.body;
  const existingUser = req.user;
  const userId = existingUser._id;

  const registerAddress = fromAddress;
  const registerBalance = await(rippledServer.getBalance(registerAddress));

  const masterKey = await(Decryption.getMasterKey());
  
  let sendMoney = asynchronous (function(){

      const encryptedRegisterAddress = Encryption.encrypt(masterKey, registerAddress);
      const encryptedRegisterSecret = encryptedAddresses[encryptedRegisterAddress];
      const registerSecret = Decryption.decrypt(masterKey, encryptedRegisterSecret);

      const result = await(rippledServer.signAndSend(registerAddress, registerSecret, userId));

      if (result) {
        console.log(result);
        res.json({message: result.resultCode});
      }
      else {
        res.json({message: "Transaction Failed"});
      }

  })
  // STILL NEED TO FIX THIS FUNCTION WITH SOME KIND OF LEARNING ALGORITHM
  let refillCashRegisterAndSend = asynchronous(function(){

      const encryptedBankAddress = Object.keys(encryptedBank)[0];
      const encryptedBankSecret = encryptedBank[encryptedBankAddress];
      const bankAddress = Decryption.decrypt(masterKey, encryptedBankAddress);
      const bankSecret = Decryption.decrypt(masterKey, encryptedBankSecret);
      
      // refilling by 20 for now until we find a better wallet refill algorithm
      const txnInfo = await(rippledServer.getTransactionInfo(bankAddress, registerAddress, 20, 0, null, null));
      const result = await(rippledServer.signAndSend(bankAddress, bankSecret, BANK_NAME, txnInfo));
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
  const existingUser = req.user;
  const userId = existingUser._id;
  if (existingUser.cashRegister) {
    const registerBalance = await (rippledServer.getBalance(existingUser.cashRegister));
    await (CashRegister.findOneAndUpdate({ address: existingUser.cashRegister }, { balance: registerBalance }, {upsert: false}));
    const transactions = await (rippledServer.getSuccessfulTransactions(existingUser.cashRegister));
    // console.log(txnInfo);
    let userObject = {
      _id: existingUser._id,
      balance: existingUser.balance,
      lastTransactionId: null
    };

    let userWallets = existingUser.wallets;
    const userAddress = existingUser.cashRegister;
    let userTransactions = [];
    // limit to 25 transactions and add scrolling on the frontend to load next 25

    const processTransaction = asynchronous(function(currTxn, setLastTransaction, stopIteration) {

      const destAddress = currTxn.destination.address;
      const destTag = currTxn.destination.tag;
      const sourceAddress = currTxn.source.address;
      const sourceTag = currTxn.source.tag;
      const destTagIdx = userWallets.indexOf(currTxn.specification.destination.tag);
      const sourceTagIdx = userWallets.indexOf(currTxn.specification.source.tag);

      if ( (destTagIdx !== -1 && destAddress === userAddress) || (sourceTagIdx !== -1 && sourceAddress === userAddress) ) {
        if ( setLastTransaction )
        {
          userObject.lastTransactionId = currTxn.id;
          setLastTransaction = false;
        }
        if (currTxn.id === existingUser.lastTransactionId) {
          stopIteration = true;
          return [setLastTransaction, stopIteration];
        }

        let counterParty, tag;

        if (destAddress === userAddress) {
          counterParty = sourceAddress;
          tag = destTag;
        } else {
          counterParty = destAddress;
          tag = sourceTag;
        }

        let balanceChange = currTxn.outcome.balanceChanges[userAddress][0].value;

        if ( balanceChange < 0 && currTxn.outcome.result === "tesSUCCESS")
        {
          // ripplePay fee for outgoing txn
          balanceChange -= 0.02;
        }
        // apply ripple ledger fee
        userObject.balance += balanceChange;
        // add to user transactions only if its a successful transaction
        if (currTxn.outcome.result === "tesSUCCESS") {
          let newTxn = new Transaction({
            txnId: currTxn.id,
            userId: userId,
            tag: tag,
            date: new Date(currTxn.outcome.timestamp),
            amount: balanceChange,
            otherParty: counterParty
          });
          await(newTxn.save());
        }
      }
      return [setLastTransaction, stopIteration];
    });
    // map over transactions asynchronously
    let setLastTransaction = true;
    let stopIteration = false;
    // Stop at a user's last transaction ID and reset the last TID.
    async.mapSeries(transactions, asynchronous(function (currTxn, cb) {
      [setLastTransaction, stopIteration] = await(processTransaction(currTxn, setLastTransaction, stopIteration));
      if ( !stopIteration )
      {
        cb(null, currTxn);
      }
      else {
        cb(true)
      }
    }), function(error, resp) {
      //SORTING OF TRANSACTIONS BY DATE INSIDE OF THE SERVER IS BLOCKING INSTEAD THE SORTING IS DONE IN HOME.JS CLIENT-SIDE
      userTransactions = await(Transaction.find({ userId }).sort({ date: 1 }).limit(25));
      User.update({_id: existingUser._id}, userObject, function (err) {
        if (err) { return next(err); }
        res.json({
          transactions: userTransactions,
          balance: userObject.balance
        });
      });
    });
  }
  else
  {
    userTransactions = await(Transaction.find({ userId }).sort({ date: 1 }).limit(25));
    res.json({
      transactions: userTransactions,
      balance: existingUser.balance
    });
  }
})

exports.loadNextTransactions = asynchronous(function(req, res, next) {
  const user = req.user;
  const userId = user._id;
  const minDate = req.query[0];
  const nextTransactions = await(Transaction.find({ userId: userId, "$gte": { date: minDate } }).sort({ date: 1 }).limit(25));
  res.json({ nextTransactions });
});