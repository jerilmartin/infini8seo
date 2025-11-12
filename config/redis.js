import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../utils/logger.js';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    logger.error('Redis reconnect on error:', err.message);
    return true;
  }
};

// Create Redis connection for BullMQ
export const createRedisConnection = () => {
  const connection = new IORedis(redisConfig);

  connection.on('connect', () => {
    logger.info('✅ Redis connected successfully');
  });

  connection.on('error', (err) => {
    logger.error('❌ Redis connection error:', err.message);
  });

  connection.on('close', () => {
    logger.warn('⚠️ Redis connection closed');
  });

  connection.on('reconnecting', () => {
    logger.info('🔄 Redis reconnecting...');
  });

  return connection;
};

// Queue name constant
export const QUEUE_NAME = 'content-generation';

// Create the content generation queue
export const createContentQueue = () => {
  const queue = new Queue(QUEUE_NAME, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: {
        age: 3600 * 24 * 7, // Keep completed jobs for 7 days
        count: 1000
      },
      removeOnFail: {
        age: 3600 * 24 * 30 // Keep failed jobs for 30 days
      }
    }
  });

  logger.info('📋 Content generation queue created');

  return queue;
};

// Create worker connection (used in worker process)
export const createWorkerConnection = () => {
  return createRedisConnection();
};

// Graceful shutdown helper
export const gracefulShutdown = async (queue, worker) => {
  logger.info('🛑 Initiating graceful shutdown...');

  try {
    if (worker) {
      await worker.close();
      logger.info('Worker closed');
    }
    if (queue) {
      await queue.close();
      logger.info('Queue closed');
    }
  } catch (error) {
    logger.error('Error during shutdown:', error);
  }
};

export default {
  createRedisConnection,
  createContentQueue,
  createWorkerConnection,
  gracefulShutdown,
  QUEUE_NAME
};

