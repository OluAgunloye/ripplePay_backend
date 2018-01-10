const passwordValidator = require('password-validator');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const async = require('asyncawait/async');
const await = require('asyncawait/await');

const MAX_CHARS = 25;
const MIN_CHARS = 8;

const ERROR_MAP = {
    'oneOf': 'too weak',
    'spaces': 'contains spaces',
    'min': `needs more than ${MIN_CHARS} characters`,
    'max': `use less than ${MAX_CHARS} characters`,
    'uppercase': 'must have an uppercase character',
    'lowercase': 'must have a lowercase character',
    'digits': 'must have a digit character',
};

exports.validatePassword = async(function(password) {
    const file = await(fs.readFileAsync('./references/commonPasswords.txt'));
    const commonPasswords = file.toString().split('\r\n');

    var schema = new passwordValidator();
    
    // Add properties to it
    schema
        .is().min(MIN_CHARS)                                    // Minimum length 8
        .is().max(MAX_CHARS)                                  // Maximum length 25
        .has().uppercase()                              // Must have uppercase letters
        .has().lowercase()                              // Must have lowercase letters
        .has().digits()                                 // Must have digits
        .has().not().spaces()                           // Should not have spaces
        .is().not().oneOf(commonPasswords); // Blacklist these values
    
    const failedSpecs = schema.validate(password, { list: true });
    if (failedSpecs.length === 0) {
        return null;
    }
    return failedSpecs.map((failedSpec) => {
        return `Password: ${ERROR_MAP[failedSpec]}`;
    });
});