const express = require('express');
const {
  sendOtp,
  resendOtp,
  verifyOtp,
  googleLogin,
} = require('../controllers/auth.controller');
const validate = require('../middleware/validator.middleware');
const {
  sendOtpLimiter,
  verifyOtpLimiter,
} = require('../middleware/rateLimit.middleware');
const {
  sendOtpSchema,
  resendOtpSchema,
  verifyOtpSchema,
  googleLoginSchema,
} = require('../validations/auth.validation');

const router = express.Router();

// "Continue with Email" / "Continue with Phone" - Unified Sign-in / Sign-up (Rate limited)
router.post('/send-otp', sendOtpLimiter, validate(sendOtpSchema), sendOtp);

// Resend OTP (1-minute cooldown enforced + Rate limited)
router.post('/resend-otp', sendOtpLimiter, validate(resendOtpSchema), resendOtp);

// Verify 4-digit OTP code & return access token + navigation direction (Rate limited & attempt capped)
router.post('/verify-otp', verifyOtpLimiter, validate(verifyOtpSchema), verifyOtp);

// "Continue with Google" direct OAuth sign-in
router.post('/google', validate(googleLoginSchema), googleLogin);

module.exports = router;

