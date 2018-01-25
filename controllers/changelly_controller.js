let Changelly = require('../services/changelly');

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

changelly.getCurrencies(function (err, data) {
    if (err) {
        console.log('Error!', err);
    } else {
        console.log('getCurrencies', data);
    }
});

changelly.createTransaction('eth', 'xrp', '1PKYrd9CC4RFB65wBrvaAsTWnp8fXePuj', 10, undefined, function (err, data) {
    if (err) {
        console.log('Error!', err);
    } else {
        console.log('createTransaction', data);
    }
});

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