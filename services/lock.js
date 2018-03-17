const { RedisCache } = require('./redis');

const async = require('asyncawait/async');
const await = require('asyncawait/await');
const Promise = require('bluebird');
const client = require('redis').createClient();
const lock = Promise.promisify(require('redis-lock')(client));
// 
exports.LOCK_PREFIX = {
    USER_ID: "user-id-",
    SCREEN_NAME: "screen-name-",
    EMAIL: "email-",
    BANK_WALLET: "bank-wallet-"
}

exports.lock = async(function(prefix, lockKey){
    const lockName = prefix + lockKey;
    const unlock = await(lock(lockName));
    return unlock;
});