// API to interact with Rippled Server
const { RippleAPI } = require('ripple-lib');
let async = require('asyncawait/async');
let await = require('asyncawait/await');
const Redis = require('../services/redis');
const Config = require('../config_enums');
const { Money, CashRegister } = require('../models/moneyStorage');

// This is the min ledger version that personal rippled server has from beginning of its time.
// exports.MIN_LEDGER_VERSION = 35550104;

const RippledServer = function() {
  this.api = new RippleAPI({
    server: 'wss://s2.ripple.com',
    // server: process.env.NODE_ENV === 'production' ? process.env.RIPPLED_SERVER : require('../configs/config').RIPPLED_SERVER
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

  if (sourceTag) {
    source = Object.assign({}, source, { "tag": sourceTag });
  }

  if (desTag) {
    destination = Object.assign({}, destination, {"tag": desTag});
  }

  const payment = { source, destination }
  return payment;
};

RippledServer.prototype.getBalance = async(function(address) {
  await(this.api.connect());
  let balInfo;
  let error = null;
  // Check if a new wallet has at least 20 balance.
  try {
    balInfo = await (this.api.getBalances(address));
  } catch (err) {
    error = err;
  }
  if (error) {
    return 0;
  }
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

RippledServer.prototype.getTransactions = async(function(address, limit) {
  await(this.api.connect());
  const serverInfo = await(this.api.getServerInfo());
  // console.log(serverInfo);
  // do newest to oldest by reversing.
  const completeLedgers = serverInfo.completeLedgers.match(/(\d+)\-(\d+)/g).reverse();
  
  const transactions = [];
  let combo, query, minMax, nextTransactions, minLedgerVersion, maxLedgerVersion;
  for (let i = 0; i < completeLedgers.length; i++) {
    combo = completeLedgers[i];
    minMax = combo.match(/\d+/g);
    minLedgerVersion = parseInt(minMax[0]);
    maxLedgerVersion = parseInt(minMax[1]);
    query = { minLedgerVersion: minLedgerVersion, maxLedgerVersion: maxLedgerVersion, types: ["payment"] };
    if (limit) {
      query = Object.assign({}, { limit: parseInt(limit) }, query);
    }
    nextTransactions = await(this.api.getTransactions(address, query));
    transactions.push(...nextTransactions);
    if (transactions.length >= limit) {
      break;
    }
  }
  // console.log(minLedgerVersion, maxLedgerVersion);
  return transactions;
});

RippledServer.prototype.getTrustlines = async(function(address) {
  await(this.api.connect());
  const trustLines = await(this.api.getTrustlines(address));
  console.log(trustLines);
  return trustLines
});

RippledServer.prototype.prepareTransaction = async(function(fromAddress, toAddress, value, sourceTag, destTag, userId) {
  await(this.api.connect());
  const paymentObject = this.preparePayment(fromAddress, toAddress, destTag, sourceTag, value);
  const txnInfo = await(this.api.preparePayment(fromAddress, paymentObject, { maxLedgerVersionOffset: 250 }));
  console.log(txnInfo);
  
  if (userId) {
    await (Redis.setInCache("prepared-transaction", userId, txnInfo.txJSON));
  }
  return txnInfo;
});

RippledServer.prototype.signAndSend = async(function(address, secret, userId) {  
  const txJSON = await(Redis.getFromTheCache("prepared-transaction", userId));
  if (!txJSON) {
    return null;
  }

  await(this.api.disconnect()); 
  const signature = this.api.sign(txJSON, secret);
  const txnBlob = signature.signedTransaction;
  
  await(this.api.connect());
  const result = await(this.api.submit(txnBlob));
  console.log(result);
  
  Redis.removeFromCache("prepared-transaction", userId);
  
  return result;
});

RippledServer.prototype.prepareRipplePayFeeTxn = async(function(personalAddress) {
  await(this.api.connect());

  const cashRegisters = await(CashRegister.find().sort({ balance: 1 }));
  const minRegister = cashRegisters[0].address;
  const amount = Config.ripplePayFee;
  console.log(personalAddress);
  
  const paymentObject = this.preparePayment(personalAddress, minRegister, null, null, amount);
  console.log(paymentObject);

  const txnInfo = await(this.api.preparePayment(personalAddress, paymentObject));

  return txnInfo;
});


RippledServer.prototype.autoPayFee = async(function(address, secret) {
  const txnInfo = await(this.prepareRipplePayFeeTxn(address));
  if (!txnInfo) {
    return null;
  }

  console.log(txnInfo);

  await(this.api.disconnect());
  const signature = this.api.sign(txnInfo.txJSON, secret);
  const txnBlob = signature.signedTransaction;

  await(this.api.connect());
  const result = await(this.api.submit(txnBlob));
  console.log(result);
  
  if (result.resultCode !== "tesSUCCESS" && result.resultCode !== "terQUEUED") {
    return null;
  }

  const feeUserIncurs = parseFloat(txnInfo.instructions.fee);
  const profit = Config.ripplePayFee - feeUserIncurs;

  Money.update({}, { '$inc': { cost: 0, revenue: profit, profit: profit } }, function (err, doc) {
    if (err) {
      console.log(err, "error updating money!");
    }
  });
  return result;
});

RippledServer.prototype.generateAddress = async(function(){
  await(this.api.connect());

  const addressObject = await(this.api.generateAddress());  
  return addressObject;
});

module.exports = RippledServer;

// const ripple = new RippledServer();
// ripple.generateAddress();
// ripple.getServerInfo();
// ripple.getTransactions("r9bxkP88S17EudmfbgdZsegEaaM76pHiW6");
// ripple.api.getTrustlines()
// ripple.getTrustlines("raa6pjF59F5DrFLcpbTVskjSVGnbWTYMXL")

// Run node rippleAPI.js to run this file for testing