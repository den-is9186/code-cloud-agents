const express = require('express');
const Redis = require('ioredis');

const app = express();

// Redis configuration from environment variables
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
};

const redis = new Redis(redisConfig);

// Handle Redis connection errors
redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.status(200).json({
      status: 'healthy',
      redis: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      redis: 'disconnected',
      error: error.message
    });
  }
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received, starting graceful shutdown`);
  
  if (server) {
    server.close(() => {
      console.log('HTTP server closed');
    });
  }
  
  try {
    await redis.quit();
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Export app for testing
module.exports = app;

// Only start server if this file is run directly
let server;
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export server and redis for graceful shutdown in tests
module.exports.server = server;
module.exports.redis = redis;
