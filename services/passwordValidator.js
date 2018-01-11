const passwordValidator = require('password-validator');
let schema = new passwordValidator();

const fs = require('fs');
const async = require('asyncawait/async');
const await = require('asyncawait/await');

const MAX_CHARS = 25;
const MIN_CHARS = 8;

const ERROR_MAP = {
    'common': 'too common',
    'spaces': 'contains spaces',
    'min': `needs more than ${MIN_CHARS} characters`,
    'max': `use less than ${MAX_CHARS} characters`,
    'uppercase': 'must have an uppercase character',
    'lowercase': 'must have a lowercase character',
    'digits': 'must have a digit character',
};

const commonPasswords = fs.readFileSync('./references/commonPasswords.txt').toString().split('\r\n');

const COMMON_PASSWORDS_DICTIONARY = {};

commonPasswords.forEach((password) => {
  COMMON_PASSWORDS_DICTIONARY[password] = true;
});

exports.validatePassword = async(function(password) {
    // Add properties to it
    schema
        .is().min(MIN_CHARS)                                    // Minimum length 8
        .is().max(MAX_CHARS)                                  // Maximum length 25
        .has().uppercase()                              // Must have uppercase letters
        .has().lowercase()                              // Must have lowercase letters
        .has().digits()                                 // Must have digits
        .has().not().spaces()                           // Should not have spaces
    
    const failedSpecs = schema.validate(password, { list: true });
    const isTooCommon = COMMON_PASSWORDS_DICTIONARY[password];

    if (isTooCommon) {
        failedSpecs.push('common');
    }

    if (failedSpecs.length === 0) {
        return null;
    }
    return failedSpecs.map((failedSpec) => {
        return `Password: ${ERROR_MAP[failedSpec]}`;
    });
});