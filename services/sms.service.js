const logger = require('../utils/logger');

class SmsService {
  /**
   * Send 4-digit OTP SMS to mobile number
   * Pluggable architecture ready for Twilio, AWS SNS, or other SMS gateways
   * @param {string} phoneNumber Destination mobile number
   * @param {string} otp 4-digit OTP code
   * @param {number} expiryMinutes Expiry window
   */
  async sendOtpSms(phoneNumber, otp, expiryMinutes = 2) {
    const message = `Your Makefield Stroke Analysis verification code is: ${otp}. Valid for ${expiryMinutes} minutes.`;

    // Log the SMS dispatch cleanly so mobile testing works out-of-the-box
    logger.info(`[SMS Dispatch] Sending OTP [${otp}] to ${phoneNumber} (${message})`);

    // NOTE: When SMS provider is chosen (e.g. Twilio, AWS SNS), add provider call here
    /*
    Example Twilio implementation:
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    */

    return {
      success: true,
      phoneNumber,
      sentAt: new Date().toISOString(),
    };
  }
}

module.exports = new SmsService();

