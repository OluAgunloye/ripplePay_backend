const passwordValidator = require('password-validator');
const Config = require('../config_enums');

let schema = new passwordValidator();

const fs = require('fs');
const async = require('asyncawait/async');
const await = require('asyncawait/await');

const ERROR_MAP = {
    'common': 'too common',
    'spaces': 'contains spaces',
    'min': `needs more than ${Config.MIN_PASSWORD_LENGTH} characters`,
    'max': `use less than ${Config.MAX_PASSWORD_LENGTH} characters`,
    'uppercase': 'must have an uppercase character',
    'lowercase': 'must have a lowercase character',
    'digits': 'must have a digit character',
    '=': 'cannot contain (=) symbol'
};

const commonPasswords = fs.readFileSync('./references/commonPasswords.txt').toString().split('\r\n');

const COMMON_PASSWORDS_DICTIONARY = {};

commonPasswords.forEach((password) => {
  COMMON_PASSWORDS_DICTIONARY[password] = true;
});

exports.validatePassword = async(function(password) {
    // Add properties to it
    schema
        .is().min(Config.MIN_PASSWORD_LENGTH)                                    // Minimum length 8
        .is().max(Config.MAX_PASSWORD_LENGTH)                                  // Maximum length 25
        .has().uppercase()                              // Must have uppercase letters
        .has().lowercase()                              // Must have lowercase letters
        .has().digits()                                 // Must have digits
        .has().not().spaces()                           // Should not have spaces
    
    const failedSpecs = schema.validate(password, { list: true });
    const isTooCommon = COMMON_PASSWORDS_DICTIONARY[password];

    if (isTooCommon) {
        failedSpecs.push('common');
    }

    if (password.match(/\=/)) {
        failedSpecs.push('=');
    }

    if (failedSpecs.length === 0) {
        return null;
    }
    return failedSpecs.map((failedSpec) => {
        return `Password: ${ERROR_MAP[failedSpec]}`;
    });
});