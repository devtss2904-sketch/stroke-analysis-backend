const morgan = require('morgan');
const logger = require('../utils/logger');
const { morganFormat } = require('../config/logger.config');

// Stream morgan logs into winston
const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

const httpLoggerMiddleware = morgan(morganFormat, { stream: morganStream });

module.exports = httpLoggerMiddleware;

