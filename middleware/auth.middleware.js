const jwt = require('jsonwebtoken');
const envConfig = require('../config/env.config');
const userRepository = require('../repositories/user.repository');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * JWT Authentication Middleware for Mobile App APIs
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

module.exports = authenticateJwt;

