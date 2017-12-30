const async = require('async');
let asynchronous = require('asyncawait/async');
let await = require('asyncawait/await');
const User = require('../models/user');
const { ShapeShiftTransaction } = require('../models/shapeShiftTransaction');
const Redis = require('../services/redis');
const RippledServer = require('../services/rippleAPI');
const rippledServer = new RippledServer();
// from e.g. would be 'from 50 XRP'
// to e.g. would be 'to 1 BTC'
// shapeshiftAddress should be URI encoded if its a Ripple address
// tell user to get the TXN id in their other wallet if its a deposit transaction
exports.createShapeshiftTransaction = asynchronous (function(req, res, next) {
  let { otherParty, from, to, shapeShiftAddress, refundAddress, orderId } = req.body;
  let userId = req.user._id;
  const shapeshift = {
    shapeShiftAddress,
    userId,
    from,
    to,
    otherParty,
    refundAddress,
    orderId,
    date: new Date()
  };
  
  let shapeShiftTransaction = new ShapeShiftTransaction(shapeshift);
  shapeShiftTransaction.save(function(err) {
    if (err) { return next(err); }
  })
  Redis.findFromAndUpdateCache("shapeshift-transactions", userId, (val) => val.push(shapeshift));
  return res.json({});
})

exports.getShapeshiftTransactions = asynchronous (function(req, res, next) {
  let existingUser = req.user;
  let userId = existingUser._id;
  let cacheVal = await (Redis.getFromTheCache("shapeshift-transactions", userId));
  if (cacheVal) {
    return res.json({shapeshiftTransactions: cacheVal});
  }
  const shapeshiftTransactions = await (ShapeShiftTransaction.find({ userId }));
  Redis.setInCache("shapeshift-transactions", userId, shapeshiftTransactions);
  res.json({ shapeshiftTransactions });
})

exports.getShapeshiftTransactionId = asynchronous (function(req, res, next) {
  const existingUser = req.user;
  const userId = existingUser._id;

  let query = req.query;
  let shapeShiftAddress = query['0'];
  let date = query['1'];
  let fromAddress = query['2'];
  const shapeShiftTransaction = await (ShapeShiftTransaction.findOne({ userId, shapeShiftAddress, date }));

  if (shapeShiftTransaction.txnId) {
    return res.json({ txnId: shapeShiftTransaction.txnId });
  }
  // if i don't have txnId for this shapeshift transaction, I will go to ripple ledger to find it.
  let toAddress = shapeShiftAddress.match(/\w+/)[0];
  let destTag = parseInt(shapeShiftAddress.match(/\?dt=(\d+)/)[1]);

  
  let txnInfo = await (rippledServer.getSuccessfulTransactions(fromAddress));

  const processTransaction = function(currTxn) {
    if(toAddress === currTxn.specification.destination.address && destTag === currTxn.specification.destination.tag) {
      return currTxn.id;
    }
    else if (new Date(currTxn.outcome.timestamp).getTime() < new Date(date).getTime()) {
      return null;
    }
    return false;
  };

  let txnId;
  async.mapSeries(txnInfo, function (currTxn, cb) {
    txnId = processTransaction(currTxn);
    if (txnId === null){
      cb(true);
    }
    else {
      cb(null, currTxn);
    }
  }, function(error, resp) {
    if (txnId) {
        shapeShiftTransaction.txnId = txnId;
        return shapeShiftTransaction.save(function(err){
          if (err) { return next(err) }
          res.json({ txnId })
        }); 
    }
    if (!txnId) {
      return res.json({ txnId });
    }
  });
});
