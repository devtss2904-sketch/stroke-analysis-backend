const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');
const envConfig = require('../config/env.config');

/**
 * Global centralized error handling middleware
 */
const errorMiddleware = (err, req, res, next) => {
  let error = err;

  // If error is not an instance of ApiError, convert it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error.errors || [], err.stack);
  }

  // Handle Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = ApiError.badRequest(`Duplicate field value entered: ${field}`);
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid resource identifier: ${err.value}`);
  }

  logger.error(`${req.method} ${req.originalUrl} - ${error.statusCode} ${error.message}`);
  if (error.stack) {
    logger.debug(error.stack);
  }

  // Consistent unified mobile API error response (no stack trace leak)
  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: Array.isArray(error.errors) && error.errors.length > 0
      ? (typeof error.errors[0] === 'string' ? error.errors : [error.message])
      : [error.message],
    ...(error.data && { data: error.data }),
    timestamp: new Date().toISOString(),
  };

  return res.status(error.statusCode).json(response);
};

module.exports = errorMiddleware;

