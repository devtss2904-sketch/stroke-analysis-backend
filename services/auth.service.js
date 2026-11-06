const jwt = require('jsonwebtoken');
const envConfig = require('../config/env.config');
const userRepository = require('../repositories/user.repository');
const otpRepository = require('../repositories/otp.repository');
const mailService = require('./mail.service');
const smsService = require('./sms.service');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Generate a random 4-digit numeric OTP code
   */
  generateOtpCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Generate JWT access token for mobile client
   */
  generateAccessToken(user) {
    const payload = {
      sub: user._id.toString(),
      email: user.email || null,
      phoneNumber: user.phoneNumber || null,
      authProvider: user.authProvider,
    };

    return jwt.sign(payload, envConfig.jwt.secret, {
      expiresIn: envConfig.jwt.expiresIn,
    });
  }

  /**
   * Check 1-minute cooldown before sending another OTP (Enforced on resend-otp)
   */
  async checkResendCooldown(identifier, purpose) {
    const latestOtp = await otpRepository.findMostRecent(identifier, purpose);
    if (latestOtp && latestOtp.resendAvailableAt > new Date()) {
      const waitSeconds = Math.ceil((latestOtp.resendAvailableAt.getTime() - Date.now()) / 1000);
      throw ApiError.badRequest(
        `Please wait ${waitSeconds} second(s) before requesting a new OTP code`,
        [`Please wait ${waitSeconds} second(s) before requesting a new OTP code`],
        { waitSeconds }
      );
    }
  }

  /**
   * Create and dispatch 4-digit OTP to Email or Mobile
   * Enforces 1-minute cooldown before sending a second OTP code
   */
  async createAndSendOtp(identifier, type, purpose = 'registration') {
    // 1. Enforce 1-minute cooldown
    await this.checkResendCooldown(identifier, purpose);

    // 2. Invalidate older unused OTPs for this identifier
    await otpRepository.invalidatePreviousOtps(identifier, purpose);

    // 3. Generate 4-digit OTP
    const otpCode = this.generateOtpCode();
    const now = Date.now();
    const expiresAt = new Date(now + envConfig.otp.expiryMinutes * 60 * 1000);
    const resendAvailableAt = new Date(now + envConfig.otp.resendCooldownSeconds * 1000);

    // 4. Save OTP record
    await otpRepository.create({
      identifier,
      type,
      otp: otpCode,
      purpose,
      expiresAt,
      resendAvailableAt,
    });

    // 5. Dispatch via channel asynchronously in background for instantaneous API response (< 50ms)
    if (type === 'email') {
      mailService.sendOtpEmail(identifier, otpCode, envConfig.otp.expiryMinutes).catch((err) => {
        logger.error(`Async email dispatch error for ${identifier}: ${err.message}`);
      });
    } else {
      smsService.sendOtpSms(identifier, otpCode, envConfig.otp.expiryMinutes).catch((err) => {
        logger.error(`Async SMS dispatch error for ${identifier}: ${err.message}`);
      });
    }

    return {
      identifier,
      type,
      purpose,
      expiresAt,
      cooldownSeconds: envConfig.otp.resendCooldownSeconds,
      validMinutes: envConfig.otp.expiryMinutes,
    };
  }

  /**
   * Send OTP for "Continue with Email" or "Continue with Phone"
   * Automatically creates a new user record if not registered yet.
   * Enforces 1-minute cooldown before sending a second OTP.
   */
  async sendLoginOtp({ identifier, type }) {
    if (!identifier) {
      throw ApiError.badRequest('Identifier (email or mobile number) is required');
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Check if user already exists
    let user = await userRepository.findByIdentifier(cleanIdentifier);
    let isNewUser = false;

    if (!user) {
      // User is not registered! Create new entry in DB
      user = await userRepository.create({
        [type === 'email' ? 'email' : 'phoneNumber']: cleanIdentifier,
        authProvider: type,
        status: 'pending',
        isProfileComplete: false,
      });
      isNewUser = true;
      logger.info(`New user entry created via ${type} login flow: ${cleanIdentifier}`);
    } else {
      // Existing user: check if profile onboarding is complete
      isNewUser = !user.isProfileComplete || (!user.firstName && !user.lastName);
    }

    // Create & dispatch 4-digit OTP (enforces 1-minute cooldown)
    const otpResult = await this.createAndSendOtp(cleanIdentifier, type, 'login');

    return {
      identifier: cleanIdentifier,
      type,
      isNewUser,
      otp: otpResult,
    };
  }

  /**
   * Resend OTP (enforces 1-minute cooldown)
   */
  async resendOtp({ identifier, purpose }) {
    if (!identifier) {
      throw ApiError.badRequest('Identifier is required to resend OTP');
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const type = cleanIdentifier.includes('@') ? 'email' : 'phone';

    // Find previous active/recent OTP to match purpose if not provided
    const recentOtp = await otpRepository.findMostRecent(cleanIdentifier, purpose);
    const resolvedPurpose = purpose || (recentOtp ? recentOtp.purpose : 'login');

    const otpResult = await this.createAndSendOtp(cleanIdentifier, type, resolvedPurpose);
    return otpResult;
  }

  /**
   * Verify 4-digit OTP code & direct user navigation
   * - If new user / profile incomplete: navigateTo = "get_started" (Screens 1 to 4)
   * - If existing user with complete profile: navigateTo = "home"
   */
  async verifyOtp({ identifier, otp, purpose = 'login' }) {
    if (!identifier || !otp) {
      throw ApiError.badRequest('Identifier and 4-digit OTP are required');
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    // Find active unexpired OTP
    const activeOtp = await otpRepository.findLatestActiveOtp(cleanIdentifier, purpose);

    if (!activeOtp) {
      // Check if there was an expired one
      const recent = await otpRepository.findMostRecent(cleanIdentifier, purpose);
      if (recent && recent.expiresAt <= new Date()) {
        throw ApiError.badRequest('OTP code has expired. Please request a new code.');
      }
      throw ApiError.badRequest('Invalid or expired OTP. Please verify and try again.');
    }

    if (activeOtp.otp !== cleanOtp) {
      throw ApiError.badRequest('Invalid OTP entered. Please check your 4-digit code.');
    }

    // Parallelize OTP markAsUsed and user lookup for maximum performance
    const [_, user] = await Promise.all([
      otpRepository.markAsUsed(activeOtp._id),
      userRepository.findByIdentifier(cleanIdentifier),
    ]);

    if (!user) {
      throw ApiError.notFound('Associated user account was not found.');
    }

    const updateFields = {
      status: 'active',
      lastLoginAt: new Date(),
    };

    if (activeOtp.type === 'email') {
      updateFields.isEmailVerified = true;
    } else {
      updateFields.isPhoneVerified = true;
    }

    if (user.firstName && user.lastName) {
      updateFields.isProfileComplete = true;
    }

    const updatedUser = await userRepository.updateById(user._id, updateFields);

    // Determine navigation target
    const isNewUser = !updatedUser.isProfileComplete || (!updatedUser.firstName && !updatedUser.lastName);
    const navigateTo = isNewUser ? 'get_started' : 'home';
    const nextStep = isNewUser ? 'get_started_1' : 'home';

    // Generate JWT Access Token
    const accessToken = this.generateAccessToken(updatedUser);

    logger.info(`User ${updatedUser._id} verified successfully via OTP. navigateTo: ${navigateTo}`);

    return {
      user: updatedUser,
      accessToken,
      isNewUser,
      isProfileComplete: updatedUser.isProfileComplete,
      navigateTo,
      nextStep,
    };
  }

  /**
   * Continue with Google OAuth sign-in flow
   * - If new user / profile incomplete: navigateTo = "get_started"
   * - If existing user with complete profile: navigateTo = "home"
   */
  async googleLogin({ googleId, email, firstName, lastName, profilePhoto }) {
    if (!email) {
      throw ApiError.badRequest('Google email is required');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists by googleId or email
    let user = (await userRepository.findByGoogleId(googleId)) || (await userRepository.findByEmail(cleanEmail));
    let isNewUser = false;

    if (user) {
      // Update existing user with Google credentials
      const updateData = {
        googleId: googleId || user.googleId,
        isEmailVerified: true,
        status: 'active',
        lastLoginAt: new Date(),
      };

      if (!user.profilePhoto && profilePhoto) {
        updateData.profilePhoto = profilePhoto;
      }
      if (!user.firstName && firstName) {
        updateData.firstName = firstName;
      }
      if (!user.lastName && lastName) {
        updateData.lastName = lastName;
      }

      user = await userRepository.updateById(user._id, updateData);
      isNewUser = !user.isProfileComplete || (!user.firstName && !user.lastName);
    } else {
      // Create new user directly
      isNewUser = true;
      user = await userRepository.create({
        googleId,
        email: cleanEmail,
        firstName: firstName || '',
        lastName: lastName || '',
        profilePhoto: profilePhoto || null,
        authProvider: 'google',
        isEmailVerified: true,
        status: 'active',
        isProfileComplete: Boolean(firstName && lastName),
        lastLoginAt: new Date(),
      });
    }

    const navigateTo = isNewUser ? 'get_started' : 'home';
    const nextStep = isNewUser ? 'get_started_1' : 'home';
    const accessToken = this.generateAccessToken(user);

    logger.info(`Google login successful for user ${user.email} (${user._id}). navigateTo: ${navigateTo}`);

    return {
      user,
      accessToken,
      isNewUser,
      isProfileComplete: user.isProfileComplete,
      navigateTo,
      nextStep,
    };
  }
}

module.exports = new AuthService();

