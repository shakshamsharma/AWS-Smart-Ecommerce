require('dotenv').config();
const app              = require('./app');
const { connectDB }    = require('./config/database');
const { connectRedis } = require('./config/redis');
const logger           = require('./utils/logger');

const PORT = process.env.PORT || 3000;

async function retry(fn, name, retries = 15, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await fn();
      return;
    } catch (err) {
      logger.warn(`${name} not ready — attempt ${i}/${retries}: ${err.message}`);
      if (i === retries) throw new Error(`${name} failed after ${retries} attempts`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

async function startServer() {
  try {
    await retry(connectDB,    'MySQL', 15, 3000);
    logger.info('MySQL connected');

    await retry(connectRedis, 'Redis', 10, 2000);
    logger.info('Redis connected');

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        const { pool }   = require('./config/database');
        const { client } = require('./config/redis');
        await pool.end();
        await client.quit();
        logger.info('Server closed');
        process.exit(0);
      });
      setTimeout(() => { process.exit(1); }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
