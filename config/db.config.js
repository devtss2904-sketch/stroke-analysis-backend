const mongoose = require('mongoose');
const envConfig = require('./env.config');
const logger = require('../utils/logger');

/**
 * Configure Mongoose settings and connection events
 */
const configureMongooseEvents = () => {
  mongoose.connection.on('connected', () => {
    const { host, port, name } = mongoose.connection;
    logger.info(`MongoDB connected: ${host}:${port}/${name}`);
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
};

/**
 * Connect to MongoDB database
 */
const connectDB = async () => {
  configureMongooseEvents();

  const options = {
    serverSelectionTimeoutMS: 5000,
    autoIndex: envConfig.nodeEnv !== 'production',
  };

  try {
    const conn = await mongoose.connect(envConfig.mongoUri, options);
    return conn;
  } catch (error) {
    logger.error(`MongoDB initial connection failed: ${error.message}`);
    throw error;
  }
};

/**
 * Disconnect from MongoDB gracefully
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close(false);
  } catch (error) {
    logger.error(`MongoDB disconnection error: ${error.message}`);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};

