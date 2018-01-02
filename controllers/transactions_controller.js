let asynchronous = require('asyncawait/async');
let await = require('asyncawait/await');
const async = require('async');
const Ripple = require('../services/rippleAPI');
const { Transaction } = require('../models/transaction');
const User = require('../models/user');

exports.applyTransaction = asynchronous(function(){

});

exports.applyFee = asynchronous(function(){

});

// exports.processPendingTransactions = asynchronous(function(pendingTransactionIds){
//     async.mapSeries(pandingTransactionIds,

//         asynchronous(function(txnId, cb) {
//             const transaction = await(rippledServer.getTransactionInfo(txnId));
//             const transactionResult = transaction.outcome.result;
//             const resultPrefix = transactionResult.slice(0,3);
//             const result = Ripple.TRANSACTION_RESULTS[resultPrefix];

//             if (result.action) {
//                 if (result.action === "queueTransaction") {
//                     return cb(null, null);
//                 }
//                 result.controller[result.action](transaction);
//             }

//             return cb(null, null);
//         }),
//         function(err, response) {
//             if (err) {
//                 console.log(err);
//                 return;
//             }
//         }
//     )
// });