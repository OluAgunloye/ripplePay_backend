const async = require('asyncawait/async');
const await = require('asyncawait/await');
const Validation = require('./index');
const passwordValidator = require('../services/passwordValidator');

exports.comparePasswordValidations = function(password) {
    let errorMessages = [];
    errorMessages.push(...Validation.validateInput(Validation.TYPE.PASSWORD, password));
    
    return errorMessages;
};

exports.signinValidations = function(email, password) {
    const errorMessages = [];

    errorMessages.push(...Validation.validateInput(Validation.TYPE.PASSWORD, password));
    errorMessages.push(...Validation.validateInput(Validation.TYPE.EMAIL, email));

    return errorMessages;
}

exports.signupValidations = async(function(email, password, screenName) {
    let errorMessages = [];
    let passwordValidationFailures;

    errorMessages.push(...Validation.validateInput(Validation.TYPE.PASSWORD, password));
    errorMessages.push(...Validation.validateInput(Validation.TYPE.EMAIL, email));
    errorMessages.push(...Validation.validateInput(Validation.TYPE.SCREEN_NAME, screenName));

    if (errorMessages.length === 0) {
        passwordValidationFailures = await(passwordValidator.validatePassword(password));

        if (passwordValidationFailures) {
            errorMessages.push(...passwordValidationFailures);
        }
    }
    
    return errorMessages;
});

exports.changePasswordValidations = async(function(oldPassword, newPassword) {
    let errorMessages = [];
    errorMessages.push(...Validation.validateInput(Validation.TYPE.PASSWORD, oldPassword));

    if (errorMessages.length === 0) {
        passwordValidationFailures = await(passwordValidator.validatePassword(newPassword));

        if (passwordValidationFailures) {
            errorMessages.push(...passwordValidationFailures);
        }
    }
    return errorMessages;
});

exports.searchValidations = function(searchString) {
    let errorMessages = [];
    errorMessages.push(...Validation.validateInput(Validation.TYPE.SCREEN_NAME, searchString));

    return errorMessages;
};