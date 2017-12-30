const jwt = require('jwt-simple');

let secret;
let EXPIRE_TIME;

if (process.env.NODE_ENV=='production') {
    secret = process.env.SECRET;

    EXPIRE_TIME = 180000;
} else {
    secret = require('../configs/config').SECRET;

    EXPIRE_TIME = 100000000;
}

exports.tokenForUser = function (user) {
    let timeStamp = new Date().getTime();
    let expireStamp = new Date(timeStamp + EXPIRE_TIME).getTime();
    const token = jwt.encode({
        sub: user.id,
        iat: timeStamp,
        exp: expireStamp
    }, secret);
    
    return token;
};