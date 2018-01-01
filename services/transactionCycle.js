import { queue } from '../../../Library/Caches/typescript/2.6/node_modules/@types/async';

let async = require('asyncawait/async');
let await = require('asyncawait/await');
const RippledServer = require('./rippledAPI');
const rippledServer = new RippledServer();
const Redis = require('./redis');

setInterval(cycleTransactions, 30000);

const cycleTransactions = async(function() {
    const currentLedgerVersion = await(rippledServer.getLedgerVersion);
    const maxLedgerVersion = await(setMaxLedgerVersion(currentLedgerVersion));
    const minLedgerVersion = await(setMinLedgerVersion(currentLedgerVersion));
});


const setMaxLedgerVersion = async(function (ledgerVersion) {
    await(Redis.setInCache("max-ledger-version", "admin", ledgerVersion));
});

// set to ledgerVersion - 1000 for now but save redis rdb file later
const setMinLedgerVersion = async(function (ledgerVersion) {
    await(Redis.setInCache("min-ledger-version", "admin", ledgerVersion));
    return ledgerVersion - 1000;
});


