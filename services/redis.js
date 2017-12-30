let await = require('asyncawait/await');
let asynchronous = require('asyncawait/async');

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

exports.setInCache = asynchronous(function(key, userId, value){
  const userKey = moddedKey(key, userId);
  RedisCache.set(userKey, JSON.stringify(value));
});

exports.findFromCacheUpdateString = asynchronous(function(key, userId, callback) {
  const userKey = moddedKey(key, userId);
  let myCacheValue = await (RedisCache.getAsync(userKey))
  if (myCacheValue) {
    let newCacheValue = callback(myCacheValue);
    RedisCache.set(userKey, newCacheValue);
  }
});

exports.removeFromCache = asynchronous(function(key, userId) {
  const userKey = moddedKey(key, userId);
  await (RedisCache.delAsync(userKey));
});