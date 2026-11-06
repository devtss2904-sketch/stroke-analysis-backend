const ApiError = require('../utils/apiError');

/**
 * 404 Route Not Found middleware
 */
const notFoundMiddleware = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = notFoundMiddleware;

