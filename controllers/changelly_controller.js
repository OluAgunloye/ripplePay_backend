let asynchronous = require('asyncawait/async');
let await = require('asyncawait/await');
const async = require('async');
let Changelly = require('../services/changelly');
let { ChangellyTransaction } = require('../models/changellyTransaction');
const RippledServer = require('../services/rippleAPI');
const rippledServer = new RippledServer();
// let { sampleCoins } = require('../references/testData');

let apiKey, apiSecret;

const TXN_LIMIT = 10;

if (process.env.NODE_ENV === 'production') {
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
function formatChangellyTransaction(changellyTxn, userId, from, to, toDestTag = "", refundDestTag = "") {
    return {
        changellyTxnId: changellyTxn.id,
        userId: userId,
        changellyAddress: changellyTxn.payinAddress,
        changellyDestTag: changellyTxn.payinExtraId,
        date: new Date(changellyTxn.createdAt).getTime(),
        otherParty: changellyTxn.payoutAddress,
        toDestTag: toDestTag,
        from: from,
        to: to,
        refundAddress: changellyTxn.refundAddress,
        refundDestTag: refundDestTag,
        fee: parseFloat(changellyTxn.changellyFee)
    };
}

exports.createChangellyTransaction = function (req, res, next) {
    let { from, to, withdrawalAddress, refundAddress, toDestTag, refundDestTag } = req.body;
    let { fromAmount, fromCoin } = from;
    fromAmount = parseFloat(fromAmount);

    let { toAmount, toCoin } = to;
    toAmount = parseFloat(toAmount);

    let userId = req.user._id;
    // apparently the extraId has to be a string? -> this has to be tested
    // have to check if refunds will go back into the wallet of the dest-tag sending money
    if (refundDestTag) {
        refundDestTag = (refundDestTag).toString();
    }
    if (toDestTag) {
        toDestTag = (toDestTag).toString();
    }

    changelly.createTransaction(
        fromCoin, toCoin, withdrawalAddress,
        fromAmount, toDestTag, refundAddress, refundDestTag,
        function (err, data) {
            if (err) {
                console.log('Error!', err);
            } else {
                console.log('createTransaction', data);
                if (data.error) {
                    return res.json({ message: data.error });
                }
                const changellyTxn = data.result;
                const transaction = formatChangellyTransaction(changellyTxn, userId, from, to, toDestTag, refundDestTag);

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
    const minDate = req.query[0];
    let nextChangellyTransactions = await(ChangellyTransaction.find({ userId: userId, date: { '$lte': minDate } }).sort({ date: -1 }).limit(TXN_LIMIT + 1));
    // remove the first transaction because that will already have been counted
    nextChangellyTransactions = nextChangellyTransactions.slice(1);
    const shouldLoadMoreChangellyTransactions = nextChangellyTransactions.length >= TXN_LIMIT ? true : false;
    res.json({ nextChangellyTransactions, shouldLoadMoreChangellyTransactions });
});

exports.getChangellyRippleTransactionId = asynchronous(function (req, res, next) {
    const existingUser = req.user;
    const userId = existingUser._id;

    let query = req.query;

    let changellyTxnId = query[0];
    let fromAddress = query[1];
    let fromDestTag = query[2];

    const changellyTransaction = await(ChangellyTransaction.findOne({ changellyTxnId }));
    if (changellyTransaction.rippleTxnId) {
        return res.json({ rippleTxnId: changellyTransaction.rippleTxnId });
    }
    // if i don't have rippleTxnId for this changelly transaction, I will go to ripple ledger to find it.
    // to help customers get refund from changelly if they have to.
    let toAddress = changellyTransaction.changellyAddress;
    let toDestTag = changellyTransaction.changellyDestTag;
    let txnInfo = await(rippledServer.getTransactions(fromAddress));

    const processTransaction = function (currTxn) {
        if (
            toAddress === currTxn.specification.destination.address &&
            parseInt(fromDestTag) === currTxn.specification.source.tag &&
            parseInt(toDestTag) === currTxn.specification.destination.tag
        ) {
            return currTxn.id;
        }
        else if (new Date(currTxn.outcome.timestamp).getTime() < new Date(changellyTransaction.date).getTime()) {
            return null;
        }
        return false;
    };

    let rippleTxnId;
    async.mapSeries(txnInfo, function (currTxn, cb) {
        rippleTxnId = processTransaction(currTxn);
        if (rippleTxnId === null || rippleTxnId) {
            cb(true);
        }
        else {
            cb(null, currTxn);
        }
    }, function (error, resp) {
        if (rippleTxnId) {
            changellyTransaction.rippleTxnId = rippleTxnId;
            return changellyTransaction.save(function (err) {
                if (err) { return next(err) }
                res.json({ rippleTxnId })
            });
        }
        if (!rippleTxnId) {
            return res.json({ rippleTxnId });
        }
    });
});

exports.getChangellyTransactionStatus = function (req, res, next) {
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

exports.getCoins = function (req, res, next) {
    // return res.json({coins: sampleCoins});
    changelly.getCurrencies(function (err, data) {
        if (err) {
            console.log('Error!', err);
            next(err);
        } else {
            // console.log('getCurrencies', data);
            return res.json({ coins: data.result });
        }
    });
}

exports.getExchangeRate = function (req, res, next) {
    let coin = req.query[0];

    changelly.getExchangeAmount(coin.toLowerCase(), 'xrp', 1, function (err, data) {
        if (err) {
            console.log('Error!', err);
            next(err);
        } else {
            console.log('getExchangeAmount', data);
            return res.json({ rate: parseFloat(data.result) });
        }
    });
}

exports.getMinAmount = function (req, res, next) {
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

// changelly.getCurrencies(function (err, data) {
//     if (err) {
//         console.log('Error!', err);
//     } else {
//         console.log('getCurrencies', data);
//         // return res.json({ coins: data.result });
//     }
// });
// 
// looks like refund extraId has to be a string??
// changelly.createTransaction(
//     'xrp', 'eth', '0xA800BaAA96f2DF6F049E460a46371B515ae7Fd7C', 
//     1000, undefined, 'rs1DXnp8LiKzFWER8JrDkMA7xBxQy1KrWi', undefined,
//     function (err, data) {
//         if (err) {
//             console.log('Error!', err);
//         } else {
//             console.log('createTransaction', data);
//         }
//     }
// );

// changelly.getMinAmount('eth', 'xrp', function (err, data) {
//     if (err) {
//         console.log('Error!', err);
//     } else {
//         console.log('getMinAmount', data);
//     }
// });

// changelly.getExchangeAmount('xrp', 'eth', 1000, function (err, data) {
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

// changelly.getStatus('dce18cd6b69f', function (err, data) {
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