let await = require('asyncawait/await');
let asynchronous = require('asyncawait/async');
var redis = require("redis");
let bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
let RedisCache;

if (!RedisCache) {
  console.log("Redis Initialized");
  if (process.env.NODE_ENV == 'production') {
    RedisCache = redis.createClient(process.env.REDISCLOUD_URL);
  } else {
    RedisCache = redis.createClient();
  }
  RedisCache.on("error", function (err) {
    console.log("Error " + err);
  });
}

function moddedKey(key, userId) {
  return `${userId}-${key}`;
}

exports.findFromAndUpdateCache = asynchronous(function (key, userId, callback, newValue) {
  const userKey = moddedKey(key, userId);
  let myCacheValue = await (RedisCache.getAsync(userKey));
  if (myCacheValue) {
    let newCacheValue = JSON.parse(myCacheValue);
    if (callback) {
      callback(newCacheValue);
    }
    RedisCache.set(userKey, JSON.stringify(newValue !== undefined ? newValue : newCacheValue));
  }
});

exports.getFromTheCache = asynchronous(function (key, userId) {
  const userKey = moddedKey(key, userId);
  let myCacheValue;
  myCacheValue = await (RedisCache.getAsync(userKey));
  if (myCacheValue) {
    return JSON.parse(myCacheValue);
  }
  return null;
});

exports.setInCache = asynchronous(function(key, userId, value, secondsExpiry){
  const userKey = moddedKey(key, userId);
  if (secondsExpiry) {
    RedisCache.set(userKey, JSON.stringify(value), 'EX', secondsExpiry);
  }
  else {
    RedisCache.set(userKey, JSON.stringify(value));
  }
});

exports.findFromCacheUpdateString = asynchronous(function(key, userId, callback) {
  const userKey = moddedKey(key, userId);
  let myCacheValue = await (RedisCache.getAsync(userKey))
  if (myCacheValue) {
    let newCacheValue = callback(myCacheValue);
    RedisCache.set(userKey, newCacheValue);
  }
});

exports.removeFromCache = function(key, userId) {
  const userKey = moddedKey(key, userId);
  
  RedisCache.delAsync(userKey).then((response) => {
    console.log(response);
  })
};