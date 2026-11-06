const putterRecordService = require('../services/putterRecord.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const RESPONSE_MESSAGES = require('../constants/responseMessages');

/**
 * Record a single live putt stroke (Screen 1: Record Shot_Result)
 */
const recordPutt = asyncHandler(async (req, res) => {
  const record = await putterRecordService.recordPutt(req.user._id, req.body);
  return ApiResponse.created(res, RESPONSE_MESSAGES.PUTTER_RECORD_CREATED, record);
});

/**
 * Bulk upload offline-buffered putt records
 */
const recordBatch = asyncHandler(async (req, res) => {
  const result = await putterRecordService.recordBatch(req.user._id, req.body.records);
  return ApiResponse.created(res, RESPONSE_MESSAGES.PUTTER_RECORD_BATCH_CREATED, result);
});

/**
 * Get history of putting sessions with date and putter filters (Screen 2: History)
 */
const getHistory = asyncHandler(async (req, res) => {
  const history = await putterRecordService.getHistory(req.user._id, req.query);
  return ApiResponse.success(res, RESPONSE_MESSAGES.PUTTER_RECORD_FETCHED, history);
});

/**
 * Get aggregated metrics ("Your Best Putter Metric" card)
 */
const getMetricsSummary = asyncHandler(async (req, res) => {
  const summary = await putterRecordService.getMetricsSummary(req.user._id, req.query);
  return ApiResponse.success(res, RESPONSE_MESSAGES.PUTTER_SUMMARY_FETCHED, summary);
});

/**
 * Get single putt record details
 */
const getRecordById = asyncHandler(async (req, res) => {
  const record = await putterRecordService.getRecordById(req.user._id, req.params.id);
  return ApiResponse.success(res, RESPONSE_MESSAGES.PUTTER_RECORD_FETCHED, record);
});

/**
 * Delete a putt record
 */
const deleteRecord = asyncHandler(async (req, res) => {
  const deleted = await putterRecordService.deleteRecord(req.user._id, req.params.id);
  return ApiResponse.success(res, RESPONSE_MESSAGES.PUTTER_RECORD_DELETED, deleted);
});

module.exports = {
  recordPutt,
  recordBatch,
  getHistory,
  getMetricsSummary,
  getRecordById,
  deleteRecord,
};

