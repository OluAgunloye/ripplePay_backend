const bcrypt = require('bcrypt-nodejs');

function createPasswordHash(password) {
    bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(password, salt, null, function (err, hash) {
            console.log(hash);
        });
    });
}