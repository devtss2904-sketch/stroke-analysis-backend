const express = require('express');
const {
  recordLog,
  getLogs,
  getLogById,
  clearLogs,
} = require('../controllers/appLog.controller');
const { authenticateJwt, optionalJwt } = require('../middleware/auth.middleware');
const validate = require('../middleware/validator.middleware');
const {
  createLogSchema,
  queryLogSchema,
} = require('../validations/appLog.validation');
const { createRateLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

// Rate limiter for log ingestion (max 120 log submissions per minute per IP to prevent spam)
const logIngestLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Log submission rate limit exceeded. Please throttle log uploads.',
});

// Record mobile application log (supports unauthenticated crash logs & authenticated user logs)
router.post('/', logIngestLimiter, optionalJwt, validate(createLogSchema), recordLog);

// Query application logs (developer/admin debugging)
router.get('/', authenticateJwt, validate(queryLogSchema, 'query'), getLogs);

// Get single application log by ID
router.get('/:id', authenticateJwt, getLogById);

// Clear logs older than X days
router.delete('/', authenticateJwt, clearLogs);

module.exports = router;

