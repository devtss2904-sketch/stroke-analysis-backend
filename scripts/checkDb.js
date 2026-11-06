const { connectDB, disconnectDB } = require('../config/db.config');
const logger = require('../utils/logger');

const run = async () => {
  try {
    await connectDB();
    logger.info('Database connection test passed');
  } catch (error) {
    logger.error(`Database connection test failed: ${error.message}`);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

run();

