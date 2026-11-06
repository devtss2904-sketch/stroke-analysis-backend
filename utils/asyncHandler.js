/**
 * Async handler wrapper to catch unhandled Promise rejections in route handlers
 * and pass them to Express error middleware
 * @param {Function} fn 
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

