const Joi = require('joi');

const sendOtpSchema = Joi.object({
  identifier: Joi.string().trim().required().messages({
    'string.empty': 'Identifier (email or mobile number) is required',
  }),
  type: Joi.string().valid('email', 'phone').required().messages({
    'any.only': 'Type must be either "email" or "phone"',
  }),
});

const resendOtpSchema = Joi.object({
  identifier: Joi.string().trim().required().messages({
    'string.empty': 'Identifier is required to resend OTP',
  }),
  purpose: Joi.string().valid('registration', 'login', 'verification').default('login'),
});

const verifyOtpSchema = Joi.object({
  identifier: Joi.string().trim().required().messages({
    'string.empty': 'Identifier (email or phone) is required',
  }),
  otp: Joi.string().length(4).pattern(/^[0-9]{4}$/).required().messages({
    'string.length': 'OTP must be exactly 4 digits',
    'string.pattern.base': 'OTP must consist of digits only',
    'string.empty': 'OTP is required',
  }),
  purpose: Joi.string().valid('registration', 'login', 'verification').default('login'),
});

const googleLoginSchema = Joi.object({
  googleId: Joi.string().optional(),
  email: Joi.string().email().lowercase().trim().required().messages({
    'string.empty': 'Email is required for Google sign-in',
  }),
  firstName: Joi.string().trim().allow('').optional(),
  lastName: Joi.string().trim().allow('').optional(),
  profilePhoto: Joi.string().uri().allow('').optional(),
});

module.exports = {
  sendOtpSchema,
  resendOtpSchema,
  verifyOtpSchema,
  googleLoginSchema,
};

