const app = require('./app');
const envConfig = require('./config/env.config');
const { connectDB, disconnectDB } = require('./config/db.config');
const logger = require('./utils/logger');

let server;

/**
 * Start the Express HTTP server and initialize database connection
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start listening on configured port
    server = app.listen(envConfig.port, () => {
      logger.info(`Server running in ${envConfig.nodeEnv} mode on http://localhost:${envConfig.port}`);
    });
  } catch (error) {
    logger.error(`Server failed to start: ${error.message}`);
    process.exit(1);
  }
};

/**
 * Handle graceful shutdown
 */
const handleGracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      await disconnectDB();
      logger.info('Server closed. Process terminated.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

// Listen for process termination signals
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

// Catch unhandled Promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Promise Rejection: ${reason}`);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

// Initialize server
startServer();
