let asynchronous = require('asyncawait/async');
let await = require('asyncawait/await');
const async = require('async');
const Ripple = require('./rippleAPI');
const Redis = require('./redis');
const TransactionController = require('../controllers/transactions_controller');

let encryptedAddresses, encryptedBank;
if (process.env.NODE_ENV == 'production') {
    encryptedAddresses = JSON.parse(process.env.REGISTERS);
    encryptedBank = JSON.parse(process.env.BANK);
} else {
    encryptedAddresses = require('../configs/addresses').encryptedAddresses;
    encryptedBank = require('../configs/addresses').encryptedBank;
}

// Make sure you have error handling to where if there is an error, then the app will not set minLedgerVersion until it works properly
const cycleTransactions = asynchronous(function() {

    const currentLedgerVersion = await(Ripple.rippledServer.getLedgerVersion());
    const maxLedgerVersion = await(setMaxLedgerVersion(currentLedgerVersion));
    const fromThisVersion = currentLedgerVersion;
    const minLedgerVersion = await(getMinLedgerVersion(fromThisVersion));

    const pendingTransactionIds = await(Redis.getStream("pending-transactions"));
    if (pendingTransactionIds) {
        await(TransactionController.processPendingTransactions(pendingTransactionIds));
    }

    const addresses = Decryption.decryptAllAddresses(masterKey, encryptedAddresses);
    async.mapSeries(addresses, 

        asynchronous(function(address, cb1) {

            const transactions = await(Ripple.rippledServer.getTransactions(address, minLedgerVersion, maxLedgerVersion));

            async.mapSeries(transactions,

                function(transaction, cb2){
                    const transactionResult = transaction.outcome.result;
                    const resultPrefix = transactionResult.slice(0, 3);
                    const result = Ripple.TRANSACTION_RESULTS[resultPrefix];

                    if (result.controller && result.action) {
                        result.controller[result.action](transaction);
                    }

                    return cb2(null, null);

                }, 
                function(err, results) {
                    if (err) { 
                        console.log(err);
                        return; 
                    }
                }
            );

        cb1(null, address);

    }), 
        function(err, resp) {
            if (err) {
                console.log(err);
                return;
            }
        }
    );

    setMinLedgerVersion(currentLedgerVersion + 1);
});


const setMaxLedgerVersion = asynchronous(function (ledgerVersion) {
    await(Redis.setInCache("max-ledger-version", "admin", ledgerVersion));
    return ledgerVersion;
});

// set to ledgerVersion - 1000 for now but save redis rdb file later
const getMinLedgerVersion = asynchronous(function (ledgerVersion) {
    const minLedgerVersion = await(Redis.getFromTheCache("min-ledger-version", "admin"));
    if (!minLedgerVersion) {
        await(Redis.setInCache("min-ledger-version", "admin", ledgerVersion - 1000));
        return ledgerVersion - 1000;
    }
    return minLedgerVersion
});

const setMinLedgerVersion = asynchronous(function (ledgerVersion) {
    const minLedgerVersion = await(Redis.setInCache("min-ledger-version", "admin", ledgerVersion));
    return minLedgerVersion
});

exports.startTransactionCycle = () => {
    setInterval(cycleTransactions, 30000);
}

