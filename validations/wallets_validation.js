const async = require('asyncawait/async');
const await = require('asyncawait/await');
const Config = require('../config_enums');
const Validation = require('./index');
const UserMethods = require('../models/methods/user');

exports.generateDestTagValidations = async(function(userId, cashRegister) {
    if (!cashRegister) {
        return 'Error Occurred';
    }
    const userWallets = await(UserMethods.getWallets(userId, cashRegister));
    
    if (userWallets.length === 5) {
        return "maximum 5 wallets";
    }
    return null;
});

exports.deleteWalletValidations = function(cashRegister, desTag) {
    const errorMessages = [];

    errorMessages.push(...Validation.validateInput(Validation.TYPE.DESTINATION_TAG, desTag));

    if (errorMessages.length === 0) {
        if (!cashRegister || !desTag) {
            errorMessages.push('Error Occurred');
        }
    }

    return errorMessages;
};

exports.generateRegisterValidations = function(user) {
    if (user.cashRegister) {
        return 'user already has a cash register';
    }
    return null;
}