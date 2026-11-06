const userService = require('../services/user.service');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const RESPONSE_MESSAGES = require('../constants/responseMessages');

/**
 * Get current logged in user's profile
 */
const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await userService.getProfile(req.user._id);
  return ApiResponse.success(res, RESPONSE_MESSAGES.RECORD_FETCHED, profile);
});

/**
 * Update user profile (Name, Birthday, Address, City, State, Zipcode)
 */
const updateMyProfile = asyncHandler(async (req, res) => {
  const updatedUser = await userService.updateProfile(req.user._id, req.body);
  return ApiResponse.success(res, RESPONSE_MESSAGES.PROFILE_UPDATED, updatedUser);
});

/**
 * Upload profile photo (Get started 1 screen)
 */
const uploadProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Please upload an image file');
  }

  const relativePath = `uploads/${req.file.filename}`;
  const result = await userService.updateProfilePhoto(req.user._id, relativePath);
  return ApiResponse.success(res, RESPONSE_MESSAGES.PHOTO_UPLOADED, result);
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadProfilePhoto,
};

