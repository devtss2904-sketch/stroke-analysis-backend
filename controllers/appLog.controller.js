const appLogService = require('../services/appLog.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const RESPONSE_MESSAGES = require('../constants/responseMessages');

/**
 * Record a mobile client application log (single or batch)
 * POST /api/v1/app-logs
 */
const recordLog = asyncHandler(async (req, res) => {
  const result = await appLogService.recordLog(req, req.body);
  return ApiResponse.created(res, RESPONSE_MESSAGES.LOG_RECORDED, result);
});

/**
 * Get application logs with filters, search, and pagination
 * GET /api/v1/app-logs
 */
const getLogs = asyncHandler(async (req, res) => {
  const result = await appLogService.getLogs(req.query);
  return ApiResponse.success(res, RESPONSE_MESSAGES.LOGS_FETCHED, result);
});

/**
 * Get single application log by ID
 * GET /api/v1/app-logs/:id
 */
const getLogById = asyncHandler(async (req, res) => {
  const log = await appLogService.getLogById(req.params.id);
  return ApiResponse.success(res, RESPONSE_MESSAGES.RECORD_FETCHED, log);
});

/**
 * Clear application logs older than X days
 * DELETE /api/v1/app-logs
 */
const clearLogs = asyncHandler(async (req, res) => {
  const days = req.query.days ? parseInt(req.query.days, 10) : 30;
  const result = await appLogService.clearLogs(days);
  return ApiResponse.success(res, RESPONSE_MESSAGES.LOGS_CLEARED, result);
});

module.exports = {
  recordLog,
  getLogs,
  getLogById,
  clearLogs,
};

