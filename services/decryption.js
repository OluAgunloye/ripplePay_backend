let aesjs = require('aes-js');
let pbkdf2 = require('pbkdf2');
const { Money } = require('../models/moneyStorage');
const Redis = require('../services/redis');
let async = require('asyncawait/async');
let await = require('asyncawait/await');

exports.getMasterKey = async(function() {
    let keyOne, keyTwo, keyHash, mongoBank;
    if (process.env.NODE_ENV=='production') {
        keyOne = process.env.KEY_ONE;
        mongoBank = await (Money.findOne());
        keyTwo = mongoBank.KEY_TWO;
        keyHash = await (Redis.getFromTheCache("secret-hash", "admin"));
        if (!keyHash) {
            keyHash = pbkdf2.pbkdf2Sync(keyOne, salt, 10, 32, 'sha512').toString('hex');
            await (Redis.setInCache("secret-hash", "admin", keyHash));
        }
    } else {
        keyOne = require('../configs/config').KEY_ONE;
        keyTwo = require('../configs/config').KEY_TWO;
        keyHash = pbkdf2.pbkdf2Sync(keyOne, keyTwo, 10, 32, 'sha512').toString('hex');
    }

    let bytes = aesjs.utils.hex.toBytes(keyOne + keyTwo + keyHash);
    let masterKey = [];

    bytes.forEach((byte, i) => {
        if (i % 2 === 1) {
            masterKey.push(byte);
        }
    });
    
    return masterKey;
});

exports.decrypt = function(masterKey, encryptedHex) {
    const encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex);
    const aesCtr = new aesjs.ModeOfOperation.ctr(masterKey, new aesjs.Counter(5));
    const decryptedBytes = aesCtr.decrypt(encryptedBytes);
    const decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
    return decryptedText;
}