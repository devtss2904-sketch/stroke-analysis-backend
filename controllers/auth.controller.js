const authService = require('../services/auth.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const RESPONSE_MESSAGES = require('../constants/responseMessages');

/**
 * Send OTP for "Continue with Email" or "Continue with Phone" (Unified Sign-in / Sign-up)
 */
const sendOtp = asyncHandler(async (req, res) => {
  const result = await authService.sendLoginOtp(req.body);
  return ApiResponse.success(res, RESPONSE_MESSAGES.OTP_SENT, result);
});

/**
 * Resend OTP (enforces 1-minute cooldown)
 */
const resendOtp = asyncHandler(async (req, res) => {
  const result = await authService.resendOtp(req.body);
  return ApiResponse.success(res, RESPONSE_MESSAGES.OTP_SENT, result);
});

/**
 * Verify 4-digit OTP and issue JWT access token with navigation target
 */
const verifyOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyOtp(req.body);
  return ApiResponse.success(res, RESPONSE_MESSAGES.OTP_VERIFIED, result);
});

/**
 * Continue with Google OAuth direct login
 */
const googleLogin = asyncHandler(async (req, res) => {
  const result = await authService.googleLogin(req.body);
  return ApiResponse.success(res, RESPONSE_MESSAGES.LOGIN_SUCCESS, result);
});

module.exports = {
  sendOtp,
  resendOtp,
  verifyOtp,
  googleLogin,
};

