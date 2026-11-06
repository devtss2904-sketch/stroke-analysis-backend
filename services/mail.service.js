const nodemailer = require('nodemailer');
const envConfig = require('../config/env.config');
const logger = require('../utils/logger');

class MailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    const { host, port, secure, user, pass } = envConfig.smtp;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        host,
        port,
        secure,
        auth: { user, pass },
      });
    } else {
      // In development without credentials, log notice
      logger.info('SMTP credentials not configured in .env. Emails will be logged to console.');
    }
  }

  /**
   * Send 4-digit OTP verification email
   * @param {string} to Recipient email address
   * @param {string} otp 4-digit numeric OTP code
   * @param {number} expiryMinutes Expiry window in minutes
   */
  async sendOtpEmail(to, otp, expiryMinutes = 2) {
    const subject = 'Your Makefield Verification Code';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 8px;">Makefield Stroke Analysis</h2>
        <p style="font-size: 16px; color: #334155;">Hello,</p>
        <p style="font-size: 15px; color: #334155;">Use the following 4-digit verification code to complete your verification:</p>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #64748b;">This code is valid for <strong>${expiryMinutes} minutes</strong>. Please do not share this code with anyone.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">If you did not request this verification, please ignore this email.</p>
      </div>
    `;

    // Always log OTP to console in development so developers can test immediately
    logger.info(`[Email Dispatch] OTP for ${to}: ${otp} (Valid for ${expiryMinutes} minutes)`);

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: envConfig.smtp.from,
          to,
          subject,
          html: htmlContent,
        });
        logger.info(`Verification email sent to ${to}`);
      } catch (error) {
        logger.error(`Failed to send email via SMTP: ${error.message}`);
        // Do not block mobile flow in development if SMTP fails
      }
    }

    return true;
  }
}

module.exports = new MailService();

