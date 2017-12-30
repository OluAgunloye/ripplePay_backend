// function encryptMyAddresses() is used solely for my purposes to encrypted my addresses and secret keys to put into heroku config vars.

let aesjs = require('aes-js');
let pbkdf2 = require('pbkdf2');

function encryptMyAddresses() {

    let keyOne, keyTwo, keyHash, bank, addresses;
    keyOne = require('../configs/config').KEY_ONE;
    keyTwo = require('../configs/config').KEY_TWO;
    keyHash = pbkdf2.pbkdf2Sync(keyOne, keyTwo, 10, 32, 'sha512').toString('hex');
    addresses = require('../configs/addresses').addresses;
    bank = require('../configs/addresses').bank;

    let bytes = aesjs.utils.hex.toBytes(keyOne+keyTwo+keyHash);
    
    let masterKey = [];

    bytes.forEach((byte, i) => {
        if (i % 2 === 1) {
            masterKey.push(byte);
        }
    });

    let encryptedAddresses = {};
    
    Object.keys(addresses).forEach((address) => {
        const secret = addresses[address];
        const cryptAddress = exports.encrypt(masterKey, address);
        const cryptSecret = exports.encrypt(masterKey, secret);
        encryptedAddresses[cryptAddress] = cryptSecret;
    });

    let encryptedBank = {};

    Object.keys(bank).forEach((address) => {
        const secret = bank[address];
        const cryptAddress = exports.encrypt(masterKey, address);
        const cryptSecret = exports.encrypt(masterKey, secret);
        encryptedBank[cryptAddress] = cryptSecret;
    });

    
    return {addresses: encryptedAddresses, bank: encryptedBank};
}

exports.encrypt = function(masterKey, text) {
    let textBytes = aesjs.utils.utf8.toBytes(text);
    
    // The counter is optional, and if omitted will begin at 1 
    let aesCtr = new aesjs.ModeOfOperation.ctr(masterKey, new aesjs.Counter(5));
    let encryptedBytes = aesCtr.encrypt(textBytes);
    
    // To print or store the binary data, you may convert it to hex 
    let encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
    return encryptedHex;
};

// for me:
// console.log(encryptMyAddresses());
