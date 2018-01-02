// API to interact with Rippled Server
const { RippleAPI } = require('ripple-lib');
let async = require('asyncawait/async');
let await = require('asyncawait/await');
const Redis = require('../services/redis');
const User = require('../models/user');
const TransactionController = require('../controllers/transactions_controller');
const { CashRegister, Money, BANK_NAME } = require('../models/moneyStorage');
const fs = require('fs');

exports.TRANSACTION_RESULTS = {
  "tel": {controller: null, action: null, description: "Error in local server."},
  "tem": {controller: null, action: null, description: "Transaction was malformed."},
  "tef": {controller: null, action: null, description: "Failed and not included in a ledger."},
  "ter": {controller: null, action: null, description: "Failed but could succeed in a future ledger. Queued."},
  "tes": {controller: TransactionController, action: "applyTransaction", description: "Success."},
  "tec": {controller: TransactionController, action: "applyFee", description: "Failed but applied to ledger to apply transaction cost."}
}

const RippledServer = function() {
  this.api = new RippleAPI({
    // server: 'wss://s2.ripple.com'
    // put the port after it
    server: process.env.NODE_ENV=='production' ? process.env.RIPPLED_SERVER : require('../configs/config').RIPPLED_SERVER,
    // key: fs.readFileSync('../configs/ripplePay.pem').toString()
    // key: process.env.RIPPLE_PEM
  });
  this.api.on('error', (errorCode, errorMessage) => {
    console.log(errorCode + ': ' + errorMessage);
  });
  this.api.on('connected', () => {
    console.log('connected');
  });
  this.api.on('disconnected', (code) => {
    console.log('disconnected, code:', code);
  });
};

RippledServer.prototype.preparePayment = function(fromAddress, toAddress, desTag, sourceTag, amount){
  let source = {
    "address": fromAddress,
    "tag": sourceTag,
    "maxAmount": {
      "value": `${amount}`,
      "currency": "XRP"
    }
  }
  let destination = {
    "address": toAddress,
    "amount": {
      "value": `${amount}`,
      "currency": "XRP"
    }
  };


  if (desTag) {
    destination = Object.assign({}, destination, {"tag": desTag});
  }

  const payment = { source, destination }
  return payment;
};

RippledServer.prototype.getBalance = async(function(address) {
  await(this.api.connect());
  const balInfo = await (this.api.getBalances(address));
  // console.log(balInfo, "IT WORKED!!!");
  return balInfo[0] ? parseFloat(balInfo[0].value) : 0;
});

RippledServer.prototype.getLedgerVersion = async(function(){
  return this.api.getLedgerVersion();
});

RippledServer.prototype.getTransactions = async(function(address, minLedgerVersion, maxLedgerVersion) {
  await(this.api.connect());
  // Following is for testing
  const current = await(this.api.getLedgerVersion());
  console.log(current, "Is the ledger version");
  // 
  const successfulTransactions = await(this.api.getTransactions(address, { minLedgerVersion, maxLedgerVersion, types: ["payment"]}));
  return successfulTransactions;
});

RippledServer.prototype.getTransactionInfo = async(function(txnId) {
  await(this.api.connect());

  const transaction = await(this.api.getTransaction(txnId));
  return transaction;
});

RippledServer.prototype.createTransaction = async(function(fromAddress, toAddress, amount, sourceTag, destTag, userId) {
  await(this.api.connect());
  const paymentObject = this.preparePayment(fromAddress, toAddress, destTag, sourceTag, amount);
  const txnInfo = await(this.api.preparePayment(fromAddress, paymentObject, { maxLedgerVersionOffset: 300 }));
  const total = amount + parseFloat(txnInfo.instructions.fee);
  if (userId) {
    await (Redis.setInCache("prepared-transaction", userId, Object.assign({}, txnInfo, { total })));
  }
  return txnInfo;
});

function senderIsUser(id) {
  return id !== BANK_NAME;
}

RippledServer.prototype.signAndSend = async(function(address, secret, userId, txnInfo) {
  await(this.api.connect());

  if (senderIsUser(userId) && !txnInfo) {
    txnInfo = await(Redis.getFromTheCache("prepared-transaction", userId));
    if (!txnInfo) {
      return null;
    }
    txnInfo.total
  }
  console.log(txnInfo);

  const fee = parseFloat(txnInfo.instructions.fee);
  const signature = this.api.sign(txnInfo.txJSON, secret);
  const txnBlob = signature.signedTransaction;

  if (senderIsUser(userId)) {
    await(Money.update({}, { '$inc': { cost: fee, revenue: 0.02 + fee, profit: 0.02 } }));  
  } else {
    await(Money.update({}, { '$inc': { cost: fee, revenue: 0, profit: -fee } })); 
  }

  const result = await(this.api.submit(txnBlob));
  await (Redis.removeFromCache("prepared-transaction", userId));
  return result;
});

exports.rippledServer = new RippledServer();

// const ripple = new RippledServer();

// ripple.getBalance("rPN2Nz2M6QBBMhSN2JxFDKhRDQq62TpJLQ");

// Run node rippleAPI.js to run this file, John