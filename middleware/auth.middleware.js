const jwt = require('jsonwebtoken');
const envConfig = require('../config/env.config');
const userRepository = require('../repositories/user.repository');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Strict JWT Authentication Middleware for Protected Mobile APIs
 */
const authenticateJwt = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Access token is missing or malformed');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, envConfig.jwt.secret);
    const user = await userRepository.findById(decoded.sub);

    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists');
    }

    if (user.status === 'suspended') {
      throw ApiError.forbidden('User account is suspended');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token has expired. Please log in again.');
    }
    throw ApiError.unauthorized('Invalid access token');
  }
});

/**
 * Optional JWT Middleware: Attaches req.user if a valid token is present,
 * but allows the request to continue gracefully with req.user = null if unauthenticated.
 * Ideal for telemetry/logging endpoints so pre-login crash logs can still be recorded!
 */
const optionalJwt = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers ? req.headers.authorization : null;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, envConfig.jwt.secret);
    const user = await userRepository.findById(decoded.sub);
    req.user = user && user.status !== 'suspended' ? user : null;
  } catch (error) {
    req.user = null;
  }

  return next();
});

// Support both default import and destructuring
authenticateJwt.authenticateJwt = authenticateJwt;
authenticateJwt.optionalJwt = optionalJwt;

module.exports = authenticateJwt;
