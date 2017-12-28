const jwt = require('jwt-simple');
const config = require('../config');

// Use the following expire time in production
// EXPIRE_TIME = 5 * 60 * 1000 // 5 minutes

// use the following expire time while debugging / on local machine
EXPIRE_TIME = 100000000

exports.tokenForUser = function (user) {
    let timeStamp = new Date().getTime();
    let expireStamp = new Date(timeStamp + EXPIRE_TIME).getTime();
    const token = jwt.encode({
        sub: user.id,
        iat: timeStamp,
        exp: expireStamp
    }, config.secret);
    
    return token;
}