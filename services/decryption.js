let aesjs = require('aes-js');
let pbkdf2 = require('pbkdf2');
const { Money } = require('../models/moneyStorage');
const Redis = require('../services/redis');
let async = require('asyncawait/async');
let await = require('asyncawait/await');

exports.getMasterKey = async(function() {
    let keyOne, keyTwo, keyHash, mongoBank;
    if (process.env.NODE_ENV=='production') {

        // Key 1 is in heroku
        keyOne = process.env.KEY_ONE;

        // Key 2 is in mongo
        mongoBank = await (Money.findOne());
        keyTwo = mongoBank.KEY_TWO;

        // hash(key1 + key2) is in redis
        keyHash = await (Redis.getFromTheCache("secret-hash", "admin"));

        // if not in redis cache, hash the 2 keys and store in redis
        if (!keyHash) {
            keyHash = pbkdf2.pbkdf2Sync(keyOne, salt, 10, 32, 'sha512').toString('hex');
            await (Redis.setInCache("secret-hash", "admin", keyHash));
        }
    } 
    else {
        // for local dev
        keyOne = require('../configs/config').KEY_ONE;
        keyTwo = require('../configs/config').KEY_TWO;
        keyHash = pbkdf2.pbkdf2Sync(keyOne, keyTwo, 10, 32, 'sha512').toString('hex');
    }

    // AES algorithm to encrypt a concatenation of the 3 keys -> 64 bytes
    let bytes = aesjs.utils.hex.toBytes(keyOne + keyTwo + keyHash);
    let masterKey = [];

    // convert to 32 bytes
    bytes.forEach((byte, i) => {
        if (i % 2 === 1) {
            masterKey.push(byte);
        }
    });
    // Final key required for encryption/decryption of encrypted address-secrets stored in heroku config vars
    // A hacker must compromise heroku, redis, and mongo to receive masterKey
    return masterKey;
});

exports.decrypt = function(masterKey, encryptedHex) {
    const encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex);
    const aesCtr = new aesjs.ModeOfOperation.ctr(masterKey, new aesjs.Counter(5));
    const decryptedBytes = aesCtr.decrypt(encryptedBytes);
    const decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
    return decryptedText;
}

exports.decryptAllAddresses = function (masterKey, encryptedAddresses) {
    const cryptAddresses = Object.keys(encryptedAddresses);
    return cryptAddresses.map((cryptAddress) => exports.decrypt(masterKey, cryptAddress));
};

// const fn = async(function() {
//     const masterKey = await(exports.getMasterKey());
//     console.log(exports.decryptAllAddresses(masterKey, encryptedAddresses));
// })

// fn()