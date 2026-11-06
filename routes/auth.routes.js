const express = require('express');
const {
  sendOtp,
  resendOtp,
  verifyOtp,
  googleLogin,
} = require('../controllers/auth.controller');
const validate = require('../middleware/validator.middleware');
const {
  sendOtpSchema,
  resendOtpSchema,
  verifyOtpSchema,
  googleLoginSchema,
} = require('../validations/auth.validation');

const router = express.Router();

// "Continue with Email" / "Continue with Phone" - Unified Sign-in / Sign-up
router.post('/send-otp', validate(sendOtpSchema), sendOtp);

// Resend OTP (1-minute cooldown enforced)
router.post('/resend-otp', validate(resendOtpSchema), resendOtp);

// Verify 4-digit OTP code & return access token + navigation direction
router.post('/verify-otp', validate(verifyOtpSchema), verifyOtp);

// "Continue with Google" direct OAuth sign-in
router.post('/google', validate(googleLoginSchema), googleLogin);

module.exports = router;

