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

if (process.env.NODE_ENV=='production') {
  mongoose.connect(process.env.MONGO_URL, { useMongoClient: true });
} else {
  mongoose.connect('mongodb://localhost/ripplePay', { useMongoClient: true });
}

const rateLimit = require('./services/rateLimit');

var router = require('./services/router');
const Token = require('./services/token');

// Apply Middlewares
app.use(helmet());

app.use(csp({
  directives: {
    defaultSrc: ["'self'"],
  }
}));

app.use(morgan('combined'));

app.use(bodyParser.json());

app.use('/v1', rateLimit.apiLimiter);
// make token through middleware for everything except signup, which must create user first.
app.use(/^(?!\/v1\/(signup|endsession))/, mung.json(
  function transform(body, req, res) {
    body.token = Token.tokenForUser(req.user);
    return body;
  }
));

app.use('/v1', router);
// Disabling etag will mess up caching mechanisms
// app.disable('etag');

var PORT = process.env.PORT || 3000;

console.log('Listening on', PORT);
app.listen(PORT);
