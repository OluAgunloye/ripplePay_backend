const async = require('asyncawait/async');
const await = require('asyncawait/await');
const Config = require('../config_enums');
const Validation = require('./index');
const UserMethods = require('../models/methods/user');

exports.generatePersonalAddressValidations = function(user) {
    if (user.personalAddress) {
        return "user already has a personal address";
    }
    return null;
};

exports.getPersonalAddressTransactionsValidations = function(limit, personalAddressBalance) {
    if (typeof limit === 'string') {
        if (limit.match(/\d+/)) {
            return null;
        }
        return 'limit is incorrect type';
    }
    else if (typeof limit !== 'number') {
        return 'limit is incorrect type'
    }
    else if (personalAddressBalance === 0) {
        return 'New XRP wallets require 20 XRP!';
    }
    else {
        return null;
    }
};

exports.removePersonalAddressValidations = function (user) {
    if (!user.personalAddress) {
        return "user does not have a personal address";
    }
    return null;
};

exports.preparePaymentWithPersonalAddressValidations = function (amount, fromAddress, toAddress, toDesTag, personalBalance) {
    let errorMessages = [];

    errorMessages.push(...Validation.validateInput(Validation.TYPE.MONEY, amount));
    errorMessages.push(...Validation.validateInput(Validation.TYPE.RIPPLE_ADDRESS, toAddress));
    errorMessages.push(...Validation.validateInput(Validation.TYPE.RIPPLE_ADDRESS, fromAddress));
    if (toDesTag) {
        errorMessages.push(...Validation.validateInput(Validation.TYPE.DESTINATION_TAG, toDesTag));
    }

    if (errorMessages.length === 0) {
        if (personalBalance - parseFloat(amount) < Config.MIN_XRP_PER_WALLET) {
            errorMessages.push("Insufficient balance in personal wallet");
        }
    }
    return errorMessages;
};

exports.sendPaymentWithPersonalAddressValidations = function(amount, registerAddress, secret) {
    let errorMessages = [];

    errorMessages.push(...Validation.validateInput(Validation.TYPE.MONEY, amount));
    errorMessages.push(...Validation.validateInput(Validation.TYPE.RIPPLE_ADDRESS, registerAddress));
    errorMessages.push(...Validation.validateInput(Validation.TYPE.SECRET_KEY, secret));

    return errorMessages;
}

exports.prepareTransactionPersonalToBankValidations = function (receiverScreenName, fromAddress, amount, sender, receiver = {}, receiverWallets=[]) {
    let errorMessages = [];
    let passwordValidationFailures;
    let senderId = sender._id;
    let receiverId = receiver._id;

    errorMessages.push(...Validation.validateInput(Validation.TYPE.MONEY, amount));
    errorMessages.push(...Validation.validateInput(Validation.TYPE.SCREEN_NAME, receiverScreenName));
    errorMessages.push(...Validation.validateInput(Validation.TYPE.RIPPLE_ADDRESS, fromAddress));

    if (errorMessages.length === 0) {
        if (!receiver || !sender || !receiverId || !senderId) {
            errorMessages.push("Payment Unsuccessful");
        } 
        else if (parseFloat(amount) && parseFloat(amount) > sender.balance) {
            errorMessages.push("Balance Insufficient");  
        } 
        else if (!receiver.cashRegister || receiverWallets.length === 0) {
            errorMessages.push("Receiver has no bank wallet!");
        }
    }
    return errorMessages;
};