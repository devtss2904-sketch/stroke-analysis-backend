/**
 * Standard API Response Messages
 */

const RESPONSE_MESSAGES = {
  SERVER_ERROR: 'Internal server error occurred. Please try again later.',
  NOT_FOUND: 'Requested resource not found',
  BAD_REQUEST: 'Invalid request data provided',
  UNAUTHORIZED: 'Authentication required to access this resource',
  FORBIDDEN: 'You do not have permission to access this resource',
  RECORD_CREATED: 'Resource created successfully',
  RECORD_FETCHED: 'Resource retrieved successfully',
  RECORD_UPDATED: 'Resource updated successfully',
  RECORD_DELETED: 'Resource deleted successfully',
  DATABASE_CONNECTED: 'Database connected successfully',
  DATABASE_DISCONNECTED: 'Database disconnected',
  OTP_SENT: 'Verification OTP sent successfully',
  OTP_VERIFIED: 'OTP verified successfully',
  OTP_INVALID: 'Invalid OTP entered',
  OTP_EXPIRED: 'OTP has expired. Please request a new code',
  OTP_COOLDOWN: 'Please wait before requesting another OTP',
  LOGIN_SUCCESS: 'Authentication successful',
  REGISTRATION_SUCCESS: 'User registered successfully. Verification OTP sent.',
  PROFILE_UPDATED: 'Profile updated successfully',
  PHOTO_UPLOADED: 'Profile photo uploaded successfully',
  PUTTER_CREATED: 'Putter added successfully',
  PUTTER_FETCHED: 'Putter(s) retrieved successfully',
  PUTTER_UPDATED: 'Putter updated successfully',
  PUTTER_DELETED: 'Putter removed successfully',
  PUTTER_NOT_FOUND: 'Putter not found',
  PUTTER_DEFAULT_SET: 'Primary putter set successfully',
  PUTTER_STATUS_UPDATED: 'Putter connection status updated successfully',
  PUTTER_RECORD_CREATED: 'Putt stroke record saved successfully',
  PUTTER_RECORD_BATCH_CREATED: 'Batch putter records uploaded successfully',
  PUTTER_RECORD_FETCHED: 'Putter records retrieved successfully',
  PUTTER_RECORD_NOT_FOUND: 'Putter record not found',
  PUTTER_RECORD_DELETED: 'Putter record deleted successfully',
  PUTTER_SUMMARY_FETCHED: 'Putter performance metrics retrieved successfully',
  LOG_RECORDED: 'Application log recorded successfully',
  LOGS_FETCHED: 'Application logs retrieved successfully',
  LOGS_CLEARED: 'Application logs cleared successfully',
};

module.exports = RESPONSE_MESSAGES;

