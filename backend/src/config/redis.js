const { createClient } = require('redis');
const logger = require('../utils/logger');

let client;

async function connectRedis() {
  client = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
    },
  });

  client.on('error', (err) => logger.error('Redis error:', err));
  client.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  await client.connect();
  return client;
}

// Cache wrapper with TTL
async function getOrSet(key, ttlSeconds, fetchFn) {
  try {
    const cached = await client.get(key);
    if (cached) return JSON.parse(cached);
  } catch (e) {
    logger.warn(`Redis get failed for key ${key}:`, e.message);
  }

  const data = await fetchFn();

  try {
    await client.setEx(key, ttlSeconds, JSON.stringify(data));
  } catch (e) {
    logger.warn(`Redis set failed for key ${key}:`, e.message);
  }

  return data;
}

// Atomic inventory decrement — prevents overselling
async function decrementInventory(productId, quantity) {
  const key = `inventory:${productId}`;
  const result = await client.decrBy(key, quantity);
  if (result < 0) {
    // Rollback
    await client.incrBy(key, quantity);
    throw new Error('Insufficient inventory');
  }
  return result;
}

async function invalidate(pattern) {
  const keys = await client.keys(pattern);
  if (keys.length > 0) await client.del(keys);
}

module.exports = {
  connectRedis,
  getOrSet,
  decrementInventory,
  invalidate,
  get client() { return client; },
};
