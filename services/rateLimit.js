let RateLimit = require('express-rate-limit');

// app.enable('trust proxy'); // only if you're behind a reverse proxy (Heroku, Bluemix, AWS if you use an ELB, custom Nginx setup, etc)

exports.apiLimiter = new RateLimit({
    windowMs: 30 * 60 * 1000, // 15 minutes
    max: 50,
    delayMs: 0, // disabled
    message: "Too many requests. Try again after 30 minutes"
});

exports.loginLimiter = new RateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    delayAfter: 3, // begin slowing down responses after the third request
    delayMs: 3 * 60 * 1000, // slow down subsequent responses by 3 minutes per request
    max: 5, // start blocking after 5 requests
    message: "Too many failed login attempts. Try again in an hour."
});

exports.userCreateLimiter = new RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minute window
    delayAfter: 10, // begin slowing down responses after the tenth request
    delayMs: 3 * 60 * 1000, // slow down subsequent responses by 3 minutes per request
    max: 15, // start blocking after 5 requests
    message: "Too many user-create requests. Try again in 15 mins"
});

exports.ledgerLookupLimiter = new RateLimit({
    windowMs: 5 * 60 * 1000, // 5 minute window
    delayAfter: 20, // begin slowing down responses after the fifteenth request
    delayMs: 3 * 1000, // slow down subsequent responses by 3 second per request
    max: 30, // start blocking after 30 requests
    message: "Too many requests. Try again in 5 minutes."
});