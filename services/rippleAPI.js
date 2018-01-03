// API to interact with Rippled Server
const { RippleAPI } = require('ripple-lib');
let async = require('asyncawait/async');
let await = require('asyncawait/await');
const Redis = require('../services/redis');
const { CashRegister, Money, BANK_NAME } = require('../models/moneyStorage');

// This is the min ledger version that personal rippled server has from beginning of its time.
exports.MIN_LEDGER_VERSION = 35527873;

const RippledServer = function() {
  this.api = new RippleAPI({
    // server: 'wss://s2.ripple.com',
    server: process.env.NODE_ENV === 'production' ? process.env.RIPPLED_SERVER : require('../configs/config').RIPPLED_SERVER
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

RippledServer.prototype.preparePayment = function(fromAddress, toAddress, desTag, sourceTag, value){
  let source = {
    "address": fromAddress,
    "tag": sourceTag,
    "maxAmount": {
      "value": `${value}`,
      "currency": "XRP"
    }
  }
  let destination = {
    "address": toAddress,
    "amount": {
      "value": `${value}`,
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

RippledServer.prototype.getServerInfo = async(function(){
  await(this.api.connect());
  const serverInfo = await(this.api.getServerInfo());
  console.log(serverInfo);
  return serverInfo;
});

RippledServer.prototype.getSuccessfulTransactions = async(function(address) {
  await(this.api.connect());
  const successfulTransactions = await(this.api.getTransactions(address, { minLedgerVersion: MIN_LEDGER_VERSION, excludeFailures: true, types: ["payment"]}));
  return successfulTransactions;
});

RippledServer.prototype.getTransactionInfo = async(function(fromAddress, toAddress, value, sourceTag, destTag, userId) {
  await(this.api.connect());
  const paymentObject = this.preparePayment(fromAddress, toAddress, destTag, sourceTag, value);
  const txnInfo = await(this.api.preparePayment(fromAddress, paymentObject, { maxLedgerVersionOffset: 1000 }));

  if (userId) {
    await (Redis.setInCache("prepared-transaction", userId, txnInfo));
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

module.exports = RippledServer;

// const ripple = new RippledServer();

// ripple.getSuccessfulTransactions("r9bxkP88S17EudmfbgdZsegEaaM76pHiW6");

// Run node rippleAPI.js to run this file for testing