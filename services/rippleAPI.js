// API to interact with Rippled Server
const { RippleAPI } = require('ripple-lib');
const { addresses, bank } = require('../controllers/addresses');
const BanksController = require('../controllers/banks_controller');
let async = require('asyncawait/async');
let await = require('asyncawait/await');
const bcrypt = require('bcrypt-nodejs');
const Redis = require('../models/redis');
const { Bank, CashRegister, Money } = require('../models/populateBank');

exports.connect = async(function() {
  const api = new RippleAPI({
    server: 'wss://s2.ripple.com/' // Public rippled server hosted by Ripple, Inc.
    //Need to change this to a private one later.
  });
  api.on('error', (errorCode, errorMessage) => {
    console.log(errorCode + ': ' + errorMessage);
  });
  api.on('connected', () => {
    console.log('connected');
  });
  api.on('disconnected', (code) => {
    console.log('disconnected, code:', code);
  });
  await (api.connect());
  return api;
})

exports.preparePayment = function(fromAddress, toAddress, desTag, sourceTag, value){
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

exports.getBalance = async(function(address) {
  const balInfo = await (api.getBalances(address));
  return balInfo[0] ? parseFloat(balInfo[0].value) : 0;
});

exports.getSuccessfulTransactions = async(function(address) {
  const successfulTransactions = await(api.getTransactions(address, { excludeFailures: true, types: ["payment"]}));
  return successfulTransactions;
});

exports.getTransactionInfo = async(function(fromAddress, toAddress, value, sourceTag, destTag, userId) {
  const paymentObject = exports.preparePayment(fromAddress, toAddress, destTag, sourceTag, value);
  const txnInfo = await(api.preparePayment(fromAddress, paymentObject, { maxLedgerVersionOffset: 1000 }));

  if (userId) {
    await (Redis.setInCache("prepared-transaction", userId, txnInfo));
  }
  return txnInfo;
});

function senderIsUser(id) {
  return id !== BanksController.BANK_NAME;
}

exports.signAndSend = async(function(address, secret, userId, txnInfo) {
  let secretHash = await(RedisCache.getAsync(address));

  if (!secretHash) {
    let source;

    if (senderIsUser(userId)) {
     source = await(CashRegister.findOne({ address }));   
    } else {
      source = await(Bank.findOne({ address }));
    }

    secretHash = source.secret;
    RedisCache.set(address, secretHash);
  }

  const response = bcrypt.compareSync(secret, secretHash);

  if (response) {

    if (senderIsUser(userId) && !txnInfo) {
      txnInfo = await(Redis.getFromTheCache("prepared-transaction", userId));
      if (!txnInfo) {
        return null;
      }
    }
    console.log(txnInfo);

    const fee = parseFloat(txnInfo.instructions.fee);
    const signature = api.sign(txnInfo.txJSON, secret);
    const txnBlob = signature.signedTransaction;

    if (senderIsUser(userId)) {
      await(Money.update({}, { '$inc': { cost: fee, revenue: 0.02 + fee, profit: 0.02 } }));  
    } else {
      await(Money.update({}, { '$inc': { cost: fee, revenue: 0, profit: -fee } })); 
    }

    const result = await(api.submit(txnBlob));
    await (Redis.removeFromCache("prepared-transaction", userId));
    return result;
  }
  return null;
});

const api = await(exports.connect());