const Redis = require('ioredis');

const { redisHost: host } = require('../config');

console.log('REDIS_HOST', host);

const redis = new Redis(host);

module.exports = redis;
