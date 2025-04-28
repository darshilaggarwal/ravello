const { createClient } = require('redis');
const config = require('./config');
const logger = require('../utils/logger');

let redisClient;

// Only initialize Redis client if REDIS_URI is provided
if (config.redisUri) {
  redisClient = createClient({
    url: config.redisUri
  });

  redisClient.on('error', (err) => {
    logger.error(`Redis Error: ${err.message}`);
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected');
  });

  redisClient.on('ready', () => {
    logger.info('Redis ready');
  });

  redisClient.on('end', () => {
    logger.info('Redis connection ended');
  });
}

const connectRedis = async () => {
  try {
    // Skip Redis connection if in development and no REDIS_URI
    if (!config.redisUri && config.nodeEnv === 'development') {
      logger.info('Redis connection skipped in development mode');
      return null;
    }
    
    // Don't proceed if Redis client wasn't initialized
    if (!redisClient) {
      logger.warn('Redis client not initialized. Check REDIS_URI configuration.');
      return null;
    }
    
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error(`Redis connection error: ${error.message}`);
    // Don't exit process in development
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
    return null;
  }
};

module.exports = {
  connectRedis,
  redisClient
}; 