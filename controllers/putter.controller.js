const putterService = require('../services/putter.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const RESPONSE_MESSAGES = require('../constants/responseMessages');

/**
 * Add a new putter (Get started 4 screen)
 */
const createPutter = asyncHandler(async (req, res) => {
  const putter = await putterService.createPutter(req.user._id, req.body);
  return ApiResponse.created(res, RESPONSE_MESSAGES.PUTTER_CREATED, putter);
});

/**
 * Get all putters for the logged-in user
 */
const getUserPutters = asyncHandler(async (req, res) => {
  const putters = await putterService.getUserPutters(req.user._id, req.query);
  return ApiResponse.success(res, RESPONSE_MESSAGES.PUTTER_FETCHED, putters);
});

/**
 * Get single putter details
 */
const getPutterById = asyncHandler(async (req, res) => {
  const putter = await putterService.getPutterById(req.user._id, req.params.id);
  return ApiResponse.success(res, RESPONSE_MESSAGES.PUTTER_FETCHED, putter);
});

/**
 * Update putter details
 */
const updatePutter = asyncHandler(async (req, res) => {
  const putter = await putterService.updatePutter(req.user._id, req.params.id, req.body);
  return ApiResponse.success(res, RESPONSE_MESSAGES.PUTTER_UPDATED, putter);
});

/**
 * Delete a putter
 */
const deletePutter = asyncHandler(async (req, res) => {
  const putter = await putterService.deletePutter(req.user._id, req.params.id);
  return ApiResponse.success(res, RESPONSE_MESSAGES.PUTTER_DELETED, putter);
});

/**
 * Set putter as primary / default
 */
const setDefaultPutter = asyncHandler(async (req, res) => {
  const putter = await putterService.setDefaultPutter(req.user._id, req.params.id);
  return ApiResponse.success(res, RESPONSE_MESSAGES.PUTTER_DEFAULT_SET, putter);
});

/**
 * Update putter connection status (BLE / IP live sync)
 */
const updateConnectionStatus = asyncHandler(async (req, res) => {
  const putter = await putterService.updateConnectionStatus(req.user._id, req.params.id, req.body);
  return ApiResponse.success(res, RESPONSE_MESSAGES.PUTTER_STATUS_UPDATED, putter);
});

module.exports = {
  createPutter,
  getUserPutters,
  getPutterById,
  updatePutter,
  deletePutter,
  setDefaultPutter,
  updateConnectionStatus,
};

