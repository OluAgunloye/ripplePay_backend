let await = require('asyncawait/await');
let asynchronous = require('asyncawait/async');

exports.findFromAndUpdateCache = asynchronous(function (key, callback, newValue) {
  let myCacheValue = await (RedisCache.getAsync(key));
  if (myCacheValue) {
    let newCacheValue = JSON.parse(myCacheValue);
    if (callback) {
      callback(newCacheValue);
    }
    RedisCache.set(key, JSON.stringify(newValue !== undefined ? newValue : newCacheValue));
  }
})

exports.getFromTheCache = asynchronous(function (key) {
  let myCacheValue;
  myCacheValue = await (RedisCache.getAsync(key));
  if (myCacheValue) {
    return JSON.parse(myCacheValue);
  }
  return null;
})

exports.setInCache = asynchronous(function(key, value){
  RedisCache.set(key, JSON.stringify(value));
})

exports.findFromCacheUpdateString = asynchronous(function(key, callback) {
  let myCacheValue = await (RedisCache.getAsync(key))
  if (myCacheValue) {
    let newCacheValue = callback(myCacheValue);
    RedisCache.set(key, newCacheValue);
  }
})
