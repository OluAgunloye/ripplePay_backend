// const bank = require('../models/vault');
const User = require('../models/user');
const {CashRegister} = require('../models/populateBank');
const {Bank} = require('../models/populateBank');
const {Money} = require('../models/populateBank');
const { findFromAndUpdateCache, getFromTheCache, setInCache } = require('../models/redis');
const async = require('async');
let asynchronous = require('asyncawait/async');
let await = require('asyncawait/await');
const {addresses, bank} = require('./addresses');
const bcrypt = require('bcrypt-nodejs');

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
    await (User.update({_id: sender_id}, {$set: senderBal, $push: {transactions: senderTransaction}}));
    await (User.findOneAndUpdate({ screenName: receiverScreenName }, {$set: receiverBal, $push: {transactions: receiverTransaction}}));
    res.json({message: "Payment was Successful", balance: senderBal.balance});
  }
  else
  {
    res.json({message: "Payment Unsuccessful"});
  }
})

exports.sendMoney = asynchronous (function(req, res, next){
  const Rippled = require('./rippleAPI');
  let server = new Rippled();
  let { amount, fromAddress, toAddress, sourceTag, toDesTag } = req.body;
  let existingUser = req.user;
  let userId = existingUser._id;
  let bankAddress = Object.keys(bank)[0];
  if ( amount > existingUser.balance )
  {
     res.json({message: "Balance Insufficient"});
     return;
  }
  await (server.connect());
  const myPayment = server.thePayment(fromAddress, toAddress, toDesTag, sourceTag, amount);
  console.log(myPayment);
  let balInfo = await (server.api.getBalances(fromAddress));
  let registerSecret = await (RedisCache.getAsync(fromAddress));
  if (!registerSecret) {
    let register = await (CashRegister.findOne({address: fromAddress}));
    registerSecret = register.secret;
    RedisCache.set(fromAddress, registerSecret);
  }
  let sendMyMoney = asynchronous (function(){
    bcrypt.compare(addresses[fromAddress], registerSecret, asynchronous (function(err, theResponse){
      if (err) { return next(err)}
      // FOR SHAPESHIFT, WILL NEED TO RETURN THE TXNID WHEN A SUCCESSFUL TRANSACTION OCCURS
      // IMP: MUST REMOVE THE TRY AND CATCH IF YOU WANT TO SEE THE ERRORS WHILE DEBUGGING
      if ( theResponse )
      {
        try {
          let orderinfo = await (server.api.preparePayment(fromAddress, myPayment));
          let theFee = orderinfo.instructions.fee;
          await (server.api.disconnect());
          let jstring = server.api.sign(orderinfo.txJSON, addresses[fromAddress]);
          let signedTransact = jstring.signedTransaction;
          await (server.connect());
          let numberFee = parseFloat(theFee);
          await (Money.update({}, {$inc: { cost: numberFee, revenue: 0.02 + numberFee, profit: 0.02 }}));
          let result = await (server.api.submit(signedTransact));
          console.log(result);
          res.json({message: result.resultCode});
        }
        catch (err){
          console.log(err);
          res.json({message: "Error In submitting transaction"});
        }
      }
      else
      {
        res.json({message: "Someone's Trying to Get into Your Wallet"});
      }
    }))
  })

  let refillCashRegisterAndSend = asynchronous(function(){
    let bankSecret = await (RedisCache.getAsync(bankAddress));
    if (!bankSecret) {
      let theBank = await (Bank.findOne({address: bankAddress}));
      bankSecret = theBank.secret;
      RedisCache.set(bankAddress, bankSecret);
    }
    let thePay = server.thePayment(bankAddress, fromAddress, null, 0, 30)
    console.log(thePay);
    try {
      bcrypt.compare(bank[bankAddress], bankSecret, asynchronous (function(err, respondent){
        if ( respondent )
        {
          let theOrderInfo = await (server.api.preparePayment(bankAddress, thePay));
          await (server.api.disconnect());
          let theJstring = server.api.sign(theOrderInfo.txJSON, bank[bankAddress]);
          let theSignedTransact = theJstring.signedTransaction;
          await (server.connect());
          let resultance = await (server.api.submit(theSignedTransact));
          console.log(resultance);
          sendMyMoney();
        }
      }))
    }
    catch (err){
      console.log(err);
    }
  })
    // Done to check if the address has a minimum of 20 ripple in it. All addresses of ours should abide
    // This may be inconsistent when you are working now because you added trustlines.
  if ( parseFloat(balInfo[0].value) - amount < 20 )
  {
    refillCashRegisterAndSend();
  }
  else
  {
    sendMyMoney();
  }
})

// Address and Destination/Source Tag used to get user's transactions and balance
// Last Transaction ID is the stopping point at which new balance is created.
// Last Transaction ID is reset to the first transaction ID that matches
// A user's address and destination tag
exports.getTransactions = asynchronous(function (req, res, next) {
  const Rippled = require('./rippleAPI');
  let server = new Rippled();
  let existingUser = req.user;
  let userId = existingUser._id;
  if (existingUser.cashRegister)
  {
    await (server.connect());
    let newbalance;
    let info = await (server.api.getBalances(existingUser.cashRegister));
    newbalance = info[0].value;
    await (CashRegister.findOneAndUpdate({ address: existingUser.cashRegister }, { balance: newbalance }, {upsert: false}));
    let txnInfo = await (server.api.getTransactions(existingUser.cashRegister, { excludeFailures: true, types: ["payment"] }));
    let userAddress = existingUser.cashRegister;
    // console.log(txnInfo);
    let changedUser = {
      _id: existingUser._id,
      balance: existingUser.balance,
      transactions: existingUser.transactions,
      lastTransactionId: null
    };

    let allWallets = existingUser.wallets;

    const manipulateTransactions = function(currTxn, setLastTransBool, stopIterBool) {
      if(allWallets.includes(currTxn.specification.destination.tag) || allWallets.includes(currTxn.specification.source.tag)) {
        if ( setLastTransBool )
        {
          changedUser.lastTransactionId = currTxn.id;
          setLastTransBool = false;
        }
        if (currTxn.id === existingUser.lastTransactionId) {
          stopIterBool = true;
          return [setLastTransBool, stopIterBool];
        }
          let counterParty;
          //This only has to look at 2 keys, so It is ok that it is using forEach. It won't be that blocking.
          Object.keys(currTxn.outcome.balanceChanges).forEach((addr) => {
            if (userAddress !== addr) {
              counterParty = addr;
              return;
            }
          });
          let balanceChange = parseFloat(currTxn.outcome.balanceChanges[userAddress][0].value.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0]);
          if ( balanceChange < 0 )
          {
            balanceChange -= 0.02;
          }
          changedUser.balance += balanceChange;
          let newTxn = {
            date: new Date(currTxn.outcome.timestamp),
            amount: balanceChange,
            txnId: currTxn.id,
            otherParty: counterParty
          };
          changedUser.transactions.unshift(newTxn);
      }
      return [setLastTransBool, stopIterBool];
    };
    // map over transactions asynchronously
    let setLastTransBool = true;
    let stopIterBool = false;
    // Stop at a user's last transaction ID and reset the last TID.
    async.mapSeries(txnInfo, function (currTxn, cb) {
      [setLastTransBool, stopIterBool] = manipulateTransactions(currTxn, setLastTransBool, stopIterBool);
      if ( !stopIterBool )
      {
        cb(null, currTxn);
      }
      else {
        cb(true)
      }
    }, function(error, resp) {
      //SORTING INSIDE OF THE SERVER IS BLOCKING INSTEAD THE SORTING IS DONE IN HOME.JS CLIENT-SIDE
      User.update({_id: existingUser._id}, changedUser, function (err) {
        if (err) { return next(err); }
        res.json({
          transactions: changedUser.transactions,
          balance: changedUser.balance
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
