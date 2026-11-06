const ApiError = require('../utils/apiError');

/**
 * Creates an in-memory IP-based sliding window rate limiter
 * @param {Object} options
 * @param {number} options.windowMs Window in milliseconds
 * @param {number} options.max Maximum allowed requests in window
 * @param {string} options.message Error message returned upon exceeding limit
 */
const createRateLimiter = ({ windowMs, max, message }) => {
  const hits = new Map();

  // Periodically evict expired entries to prevent memory leaks
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Do not hold Node.js event loop open for cleanup timer
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req, res, next) => {
    // Identify client by IP (respecting forward headers from reverse proxies)
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = (forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || req.ip || 'unknown';

    const now = Date.now();
    let record = hits.get(clientIp);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(clientIp, record);
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      const waitSeconds = Math.ceil((record.resetTime - now) / 1000);
      return next(
        ApiError.tooManyRequests(
          message || `Too many requests from this IP. Please wait ${waitSeconds} second(s) before trying again.`,
          [`Rate limit exceeded. Try again in ${waitSeconds}s.`],
          { waitSeconds }
        )
      );
    }

    return next();
  };
};

// Strict rate limiter for sending/resending OTPs (Max 15 requests per 10 minutes)
const sendOtpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: 'Too many OTP requests from this network. Please try again after 10 minutes.',
});

// Strict rate limiter for verifying OTPs (Max 25 attempts per 10 minutes to prevent brute-force)
const verifyOtpLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 25,
  message: 'Too many verification attempts from this network. Please try again after 10 minutes.',
});

module.exports = {
  createRateLimiter,
  sendOtpLimiter,
  verifyOtpLimiter,
};

