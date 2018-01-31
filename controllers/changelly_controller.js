let Changelly = require('../services/changelly');
let ChangellyTransaction = require('../models/changellyTransaction');

let apiKey, apiSecret;

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
function formatChangellyOrder(order, userId, from, to) {
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
                const order = formatChangellyOrder(data.result, userId, from, to);
                
                const changellyTransaction = new ChangellyTransaction(order);
                changellyTransaction.save(function (error) {
                    if (error) { return next(error); }
                    return res.json(order);
                });
            }
        }
    );
};

changelly.getCurrencies(function (err, data) {
    if (err) {
        console.log('Error!', err);
    } else {
        console.log('getCurrencies', data);
    }
});
// looks like refund extraId has to be a string??
changelly.createTransaction(
    'eth', 'xrp', 'rs1DXnp8LiKzFWER8JrDkMA7xBxQy1KrWi', 
    100, undefined, '0xA800BaAA96f2DF6F049E460a46371B515ae7Fd7C', undefined,
    function (err, data) {
        if (err) {
            console.log('Error!', err);
        } else {
            console.log('createTransaction', data);
        }
    }
);

changelly.getMinAmount('eth', 'btc', function (err, data) {
    if (err) {
        console.log('Error!', err);
    } else {
        console.log('getMinAmount', data);
    }
});

changelly.getExchangeAmount('btc', 'eth', 1, function (err, data) {
    if (err) {
        console.log('Error!', err);
    } else {
        console.log('getExchangeAmount', data);
    }
});

changelly.getTransactions(10, 0, 'btc', undefined, undefined, function (err, data) {
    if (err) {
        console.log('Error!', err);
    } else {
        console.log('getTransactions', data);
    }
});

changelly.getStatus('215065b60531', function (err, data) {
    if (err) {
        console.log('Error!', err);
    } else {
        console.log('getStatus', data);
    }
});

changelly.on('payin', function (data) {
    console.log('payin', data);
});

changelly.on('payout', function (data) {
    console.log('payout', data);
});