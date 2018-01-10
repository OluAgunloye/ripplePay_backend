// require express
const express = require('express');
var app = express();
// require middleware
const mung = require('express-mung');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const csp = require('helmet-csp');
// require db
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
// setup redis
var redis = require("redis");
let bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);

let client;

if (process.env.NODE_ENV=='production') {
  client = redis.createClient(process.env.REDISCLOUD_URL);
} else {
  client = redis.createClient(); 
}

client.on("error", function (err) {
  console.log("Error " + err);
});
global.RedisCache = client;

var router = require('./services/router');
const { tokenForUser } = require('./services/token');

if (process.env.NODE_ENV=='production') {
  mongoose.connect(process.env.MONGO_URL);
} else {
  mongoose.connect('mongodb://localhost:ripplePay/ripplePay');
}
app.use(helmet());
app.use(csp({
  directives: {
    defaultSrc: ["'self'"],
  }
}));
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
