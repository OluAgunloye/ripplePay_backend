//This is where everything begins when the server nodemon is started up. All the routes have v1 for this reason.
const express = require('express');
const mung = require('express-mung');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const helmet = require('helmet');
mongoose.Promise = global.Promise;
var app = express();
var redis = require("redis");
let bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
let client = redis.createClient();
client.on("error", function (err) {
  console.log("Error " + err);
});
global.RedisCache = client;

var router = require('./services/router');
const { tokenForUser } = require('./services/token');
// RedisCache.end(true);
// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });

if (process.env.NODE_ENV=='production') {
  mongoose.connect(process.env.MONGO_URL);
} else {
  mongoose.connect('mongodb://localhost:ripplePay/ripplePay');
}
app.use(helmet());
app.use(morgan('combined'));
app.use(bodyParser.json());
// make token through middleware for everything except signup, which must create user first.
app.use(/^(?!\/v1\/(signup))/, mung.json(
  function transform(body, req, res) {
    body.token = tokenForUser(req.user);
    return body;
  }
));
app.use('/v1', router);
// Disabling etag will mess up caching mechanisms
// app.disable('etag');

var PORT = process.env.PORT || 3000;

console.log('Listening on', PORT);
app.listen(PORT);
