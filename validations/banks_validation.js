const async = require('asyncawait/async');
const await = require('asyncawait/await');
const Config = require('../config_enums');
const Validation = require('./index');

exports.inBankSendValidations = function (receiverScreenName, amount, sender, receiver={}) {
    let errorMessages = [];
    let passwordValidationFailures;
    let senderId = sender._id;
    let receiverId = receiver._id;

    errorMessages.push(...Validation.validateInput(Validation.TYPE.MONEY, amount));
    errorMessages.push(...Validation.validateInput(Validation.TYPE.SCREEN_NAME, receiverScreenName));

    if (errorMessages.length === 0) {
        if (!receiver || !sender || !receiverId || !senderId) {
            errorMessages.push("Payment Unsuccessful");
        }
        else {
            if (parseFloat(amount) && parseFloat(amount) > sender.balance) {
                errorMessages.push("Balance Insufficient");
            }
        }
    }
    return errorMessages;
};

exports.preparePaymentValidations = function (amount, fromAddress, toAddress, sourceTag, toDesTag, user, ripplePayAddresses) {
    let errorMessages = [];
    
    errorMessages.push(...Validation.validateInput(Validation.TYPE.MONEY, amount));
    errorMessages.push(...Validation.validateInput(Validation.TYPE.RIPPLE_ADDRESS, toAddress));
    errorMessages.push(...Validation.validateInput(Validation.TYPE.RIPPLE_ADDRESS, fromAddress));
    errorMessages.push(...Validation.validateInput(Validation.TYPE.DESTINATION_TAG, sourceTag));
    if (toDesTag) {
        errorMessages.push(...Validation.validateInput(Validation.TYPE.DESTINATION_TAG, toDesTag));
    }
    
    if (errorMessages.length === 0) {
        if (parseFloat(amount) > user.balance) {
            errorMessages.push('User Balance insufficient');
        }
        // LEAVE THIS OUT TO ALLOW FOR TESTING
        // else if (ripplePayAddresses.includes(toAddress)) {
        //   errorMessages.push("Send with no fee to a ripplePay user!");
        // }
    }


    return errorMessages;
};

exports.signAndSendValidations = function(amount, registerAddress, registerBalance, user) {
    let errorMessages = [];

    errorMessages.push(...Validation.validateInput(Validation.TYPE.MONEY, amount));
    errorMessages.push(...Validation.validateInput(Validation.TYPE.RIPPLE_ADDRESS, registerAddress));

    if (errorMessages.length === 0) {
        if (parseFloat(amount) > user.balance) {
            errorMessages.push('User Balance insufficient');
        }
        else if (registerBalance - amount < Config.MIN_XRP_PER_WALLET) {
            errorMessages.push("RipplePay cashRegister error. Please contact us at ripplePay@gmail.com");
        }
    }

    return errorMessages;
};