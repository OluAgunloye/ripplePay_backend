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

const TXN_LIMIT = 10;

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
    date: new Date().getTime()
  };
  const shapeShiftTransaction = new ShapeShiftTransaction(shapeshift);
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
  const shapeshiftTransactions = await (ShapeShiftTransaction.find({ userId }).sort({ date: -1 }).limit(TXN_LIMIT));
  Redis.setInCache("shapeshift-transactions", userId, shapeshiftTransactions);
  res.json({ shapeshiftTransactions });
})

// $lt instead of $lte because transaction happening at same millisecond for user is highly unlikely. Maybe change later.
exports.loadNextShapeShiftTransactions = asynchronous(function (req, res, next) {
  const user = req.user;
  const userId = user._id;
  const maxDate = req.query[0];
  const nextShapeShiftTransactions = await(ShapeShiftTransaction.find({ userId: userId, date: { '$lt': maxDate } }).sort({ date: -1 }).limit(TXN_LIMIT));
  Redis.findFromAndUpdateCache("shapeshift-transactions", userId, (val) => val.unshift(...nextShapeShiftTransactions));
  const shouldLoadMoreShapeShiftTransactions = nextShapeShiftTransactions.length >= TXN_LIMIT ? true : false;
  res.json({ nextShapeShiftTransactions, shouldLoadMoreShapeShiftTransactions });
});

exports.getShapeshiftTransactionId = asynchronous (function(req, res, next) {
  const existingUser = req.user;
  const userId = existingUser._id;

  let query = req.query;
  let shapeShiftAddress = query['0'];
  let date = query['1'];
  let fromAddress = query['2'];
  const shapeShiftTransaction = await (ShapeShiftTransaction.findOne({ userId, date, shapeShiftAddress }));

  if (shapeShiftTransaction.txnId) {
    return res.json({ txnId: shapeShiftTransaction.txnId });
  }
  // if i don't have txnId for this shapeshift transaction, I will go to ripple ledger to find it.
  // to help customers get refund from shapeshift if they have to.
  let toAddress = shapeShiftAddress.match(/\w+/)[0];
  let destTag = parseInt(shapeShiftAddress.match(/\?dt=(\d+)/)[1]);

  
  let txnInfo = await (rippledServer.getTransactions(fromAddress));

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
