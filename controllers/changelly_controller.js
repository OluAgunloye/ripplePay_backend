let Changelly = require('../services/changelly');
let ChangellyTransaction = require('../models/changellyTransaction');
let asynchronous = require('asyncawait/async');
let await = require('asyncawait/await');

let apiKey, apiSecret;

const TXN_LIMIT = 10;

if (process.env.NODE_ENV==='production')  {
    apiKey = process.env.CHANGELLY_APIKEY;
    apiSecret = process.env.CHANGELLY_API_SECRET;
}
else {
    apiKey = require('../configs/config').CHANGELLY_APIKEY;
    apiSecret = require('../configs/config').CHANGELLY_API_SECRET;
}

// code from https://github.com/changelly/api-changelly MIT licence.
var changelly = new Changelly(
    apiKey,
    apiSecret
);
// from and to are objects with schema { from(to)Coin: 'xrp', from(to)Amount: 30 }
function formatChangellyTransaction(order, userId, from, to) {
    return {
        orderId: order.id,
        userId: userId,
        changellyAddress: order.payinAddress,
        changellyDestTag: order.payinExtraId,
        date: new Date(order.createdAt).getTime(),
        otherParty: order.payoutAddress,
        from: from,
        to: to,
        refundAddress: order.refundAddress,
        fee: parseFloat(order.changellyFee)
    };
}

exports.createChangellyTransaction = function(req, res, next) {
    let { from, to, withdrawalAddress, pair, refundAddress, toDestTag, refundDestTag } = req.body;
    let { fromAmount, fromCoin } = from;
    let { toAmount, toCoin } = to;
    let userId = req.user._id;
    // apparently the refundExtraId has to be a string? -> this has to be tested
    // have to check if refunds will go back into the wallet of the dest-tag sending money
    if (refundDestTag) {
        refundDestTag = (refundDestTag).toString();
    }
    
    changelly.createTransaction(
        from, to, withdrawalAddress,
        toAmount, toDestTag, refundAddress, refundDestTag,
        function (err, data) {
            if (err) {
                console.log('Error!', err);
            } else {
                console.log('createTransaction', data);
                const transaction = formatChangellyTransaction(data.result, userId, from, to);
                
                const changellyTransaction = new ChangellyTransaction(transaction);
                changellyTransaction.save(function (error) {
                    if (error) { return next(error); }
                    return res.json(transaction);
                });
            }
        }
    );
};

exports.getChangellyTransactions = asynchronous(function (req, res, next) {
    let existingUser = req.user;
    let userId = existingUser._id;
    const changellyTransactions = await(ChangellyTransaction.find({ userId }).sort({ date: -1 }).limit(TXN_LIMIT));
    res.json({ changellyTransactions });
})

exports.loadNextChangellyTransactions = asynchronous(function (req, res, next) {
    const user = req.user;
    const userId = user._id;
    const maxDate = req.query[0];
    let nextChangellyTransactions = await(ChangellyTransaction.find({ userId: userId, date: { '$lte': maxDate } }).sort({ date: -1 }).limit(TXN_LIMIT + 1));
    // remove the first transaction because that will already have been counted
    nextChangellyTransactions = nextChangellyTransactions.slice(1);
    const shouldLoadMoreChangellyTransactions = nextChangellyTransactions.length >= TXN_LIMIT ? true : false;
    res.json({ nextChangellyTransactions, shouldLoadMoreChangellyTransactions });
});

exports.getChangellyTransactionId = asynchronous(function (req, res, next) {
    const existingUser = req.user;
    const userId = existingUser._id;

    let query = req.query;

    let changellyAddress = query[0];
    let date = query[1];
    let fromAddress = query[2];

    const changellyTransaction = await(ChangellyTransaction.findOne({ userId, date, changellyAddress }));

    if (changellyTransaction.txnId) {
        return res.json({ txnId: changellyTransaction.txnId });
    }
    // if i don't have txnId for this changelly transaction, I will go to ripple ledger to find it.
    // to help customers get refund from changelly if they have to.
    let toAddress = changellyAddress.match(/\w+/)[0];
    let destTag = parseInt(changellyAddress.match(/\?dt=(\d+)/)[1]);


    let txnInfo = await(rippledServer.getTransactions(fromAddress));

    const processTransaction = function (currTxn) {
        if (toAddress === currTxn.specification.destination.address && destTag === currTxn.specification.destination.tag) {
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
        if (txnId === null) {
            cb(true);
        }
        else {
            cb(null, currTxn);
        }
    }, function (error, resp) {
        if (txnId) {
            changellyTransaction.txnId = txnId;
            return changellyTransaction.save(function (err) {
                if (err) { return next(err) }
                res.json({ txnId })
            });
        }
        if (!txnId) {
            return res.json({ txnId });
        }
    });
});

exports.getChangellyTransactionStatus = function(req, res, next) {
    let changellyTxnId = req.query[0];

    changelly.getStatus(changellyTxnId, function (err, data) {
        if (err) {
            console.log('Error!', err);
            next(err);
        } else {
            console.log('getStatus', data);
            return res.json({ txStat: data.result });
        }
    });
}

exports.getCoins = function(req, res, next) {
    changelly.getCurrencies(function (err, data) {
        if (err) {
            console.log('Error!', err);
            next(err);
        } else {
            console.log('getCurrencies', data);
            return res.json({ coins: data.result });
        }
    });
}

exports.getExchangeRate = function(req, res, next) {
    let coin = req.query[0];

    changelly.getExchangeAmount(coin, 'xrp', 1, function (err, data) {
        if (err) {
            console.log('Error!', err);
            next(err);
        } else {
            console.log('getExchangeAmount', data);
            return res.json({ rate: parseFloat(data.result) });
        }
    });
}

exports.getMinAmount = function(req, res, next) {
    let fromCoin = req.query[0];
    let toCoin = req.query[1];
    changelly.getMinAmount(fromCoin, toCoin, function (err, data) {
        if (err) {
            console.log('Error!', err);
            next(err);
        } else {
            console.log('getMinAmount', data);
            return res.json({ minAmount: parseFloat(data.result) })
        }
    });
}
// looks like refund extraId has to be a string??
// changelly.createTransaction(
//     'eth', 'xrp', 'rs1DXnp8LiKzFWER8JrDkMA7xBxQy1KrWi', 
//     100, undefined, '0xA800BaAA96f2DF6F049E460a46371B515ae7Fd7C', undefined,
//     function (err, data) {
//         if (err) {
//             console.log('Error!', err);
//         } else {
//             console.log('createTransaction', data);
//         }
//     }
// );

// changelly.getMinAmount('eth', 'btc', function (err, data) {
//     if (err) {
//         console.log('Error!', err);
//     } else {
//         console.log('getMinAmount', data);
//     }
// });

// changelly.getExchangeAmount('btc', 'eth', 1, function (err, data) {
//     if (err) {
//         console.log('Error!', err);
//     } else {
//         console.log('getExchangeAmount', data);
//     }
// });

// changelly.getTransactions(10, 0, 'btc', undefined, undefined, function (err, data) {
//     if (err) {
//         console.log('Error!', err);
//     } else {
//         console.log('getTransactions', data);
//     }
// });

// changelly.getStatus('215065b60531', function (err, data) {
//     if (err) {
//         console.log('Error!', err);
//     } else {
//         console.log('getStatus', data);
//     }
// });

// changelly.on('payin', function (data) {
//     console.log('payin', data);
// });

// changelly.on('payout', function (data) {
//     console.log('payout', data);
// });