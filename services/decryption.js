let aesjs = require('aes-js');
let pbkdf2 = require('pbkdf2');
const { Money } = require('../models/populateBank');
const Redis = require('../models/redis');
let async = require('asyncawait/async');
let await = require('asyncawait/await');

exports.getMasterKey = async(function() {
    let password, salt, hash, bank, addresses, mongoBank;
    if (process.env.NODE_ENV=='production') {
        password = process.env.PASSWORD;
        mongoBank = await (Money.findOne());
        salt = mongoBank.salt;
        hash = await (Redis.getFromTheCache("secret-hash", "admin"));
        if (!hash) {
            // put the following in a different file and gitignore from github but not from heroku
            hash = pbkdf2.pbkdf2Sync(password, salt, 10, 32, 'sha512').toString('hex');
            await (Redis.setInCache("secret-hash", "admin", hash));
        }
    } else {
        password = require('../config').password;
        salt = require('../config').salt;
        hash = pbkdf2.pbkdf2Sync(password, salt, 10, 32, 'sha512').toString('hex');
        addresses = require('../controllers/addresses').addresses;
        bank = require('../controllers/addresses').bank;
    }

    let arr = aesjs.utils.hex.toBytes(password + salt + hash);
    let masterKey = [];
    arr.forEach((val, i) => {
        if (i % 2 === 1) {
            masterKey.push(val);
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