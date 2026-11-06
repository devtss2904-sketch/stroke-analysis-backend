const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const envConfig = require('../config/env.config');
const userRepository = require('../repositories/user.repository');
const otpRepository = require('../repositories/otp.repository');
const mailService = require('./mail.service');
const smsService = require('./sms.service');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');
const { normalizeEmail, normalizePhone } = require('../utils/normalize');

class AuthService {
  /**
   * Generate a cryptographically secure 4-digit numeric OTP code (1000 - 9999)
   */
  generateOtpCode() {
    return crypto.randomInt(1000, 10000).toString();
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
   * Race-condition and duplicate-proof: handles E11000 gracefully.
   * Enforces 1-minute cooldown before sending a second OTP.
   */
  async sendLoginOtp({ identifier, type }) {
    if (!identifier) {
      throw ApiError.badRequest('Identifier (email or mobile number) is required');
    }

    const cleanIdentifier = type === 'email' ? normalizeEmail(identifier) : normalizePhone(identifier);
    if (!cleanIdentifier) {
      throw ApiError.badRequest(`Invalid ${type === 'email' ? 'email address' : 'mobile number'}`);
    }

    // Check if user already exists
    let user = await userRepository.findByIdentifier(cleanIdentifier);
    let isNewUser = false;

    if (!user) {
      try {
        // User is not registered! Create new entry in DB
        user = await userRepository.create({
          [type === 'email' ? 'email' : 'phoneNumber']: cleanIdentifier,
          authProvider: type,
          status: 'pending',
          isProfileComplete: false,
        });
        isNewUser = true;
        logger.info(`New user entry created via ${type} login flow: ${cleanIdentifier}`);
      } catch (err) {
        // Race condition protection: If another concurrent request just created the user
        if (err.code === 11000) {
          user = await userRepository.findByIdentifier(cleanIdentifier);
          if (!user) throw err;
          isNewUser = !user.isProfileComplete || (!user.firstName && !user.lastName);
          logger.info(`Concurrent user creation detected and resolved for: ${cleanIdentifier}`);
        } else {
          throw err;
        }
      }
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

    const isEmail = identifier.toString().includes('@');
    const cleanIdentifier = isEmail ? normalizeEmail(identifier) : normalizePhone(identifier);
    const type = isEmail ? 'email' : 'phone';

    if (!cleanIdentifier) {
      throw ApiError.badRequest('Invalid identifier for OTP resend');
    }

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

    const isEmail = identifier.toString().includes('@');
    const cleanIdentifier = isEmail ? normalizeEmail(identifier) : normalizePhone(identifier);
    const cleanOtp = otp.toString().trim();

    if (!cleanIdentifier) {
      throw ApiError.badRequest('Invalid identifier provided');
    }

    // Find active unexpired OTP
    let activeOtp = await otpRepository.findLatestActiveOtp(cleanIdentifier, purpose);

    // Fallback: If not found and identifier is phone, check raw trimmed identifier in case OTP was stored before normalization
    if (!activeOtp && !isEmail && identifier.toString().trim() !== cleanIdentifier) {
      activeOtp = await otpRepository.findLatestActiveOtp(identifier.toString().trim(), purpose);
    }

    if (!activeOtp) {
      // Check if there was an expired one
      const recent = await otpRepository.findMostRecent(cleanIdentifier, purpose);
      if (recent && recent.expiresAt <= new Date()) {
        throw ApiError.badRequest('OTP code has expired. Please request a new code.');
      }
      throw ApiError.badRequest('Invalid or expired OTP. Please verify and try again.');
    }

    if (activeOtp.otp !== cleanOtp) {
      const currentAttempts = (activeOtp.attempts || 0) + 1;
      if (currentAttempts >= 5) {
        await otpRepository.markAsUsed(activeOtp._id);
        throw ApiError.badRequest('Too many failed OTP attempts. This code has been invalidated for security. Please request a new code.');
      }
      await otpRepository.incrementAttempts(activeOtp._id);
      const remainingAttempts = 5 - currentAttempts;
      throw ApiError.badRequest(`Invalid OTP entered. You have ${remainingAttempts} attempt(s) remaining.`);
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
    if (!email || !googleId) {
      throw ApiError.badRequest('Google ID and email are required');
    }

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) {
      throw ApiError.badRequest('Invalid Google email address');
    }

    const cleanGoogleId = googleId.toString().trim();
    if (!cleanGoogleId) {
      throw ApiError.badRequest('Invalid Google ID provided');
    }

    // Check if user exists by googleId or email
    let user = (await userRepository.findByGoogleId(cleanGoogleId)) || (await userRepository.findByEmail(cleanEmail));
    let isNewUser = false;

    if (user) {
      // Security Check: If account already has a Google ID linked, ensure incoming Google ID strictly matches
      if (user.googleId && user.googleId !== cleanGoogleId) {
        throw ApiError.unauthorized('Google account ID does not match the linked account');
      }

      // Update existing user with Google credentials
      const updateData = {
        googleId: cleanGoogleId,
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
      // Create new user directly (race-condition protected)
      try {
        isNewUser = true;
        user = await userRepository.create({
          ...(cleanGoogleId && { googleId: cleanGoogleId }),
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
      } catch (err) {
        if (err.code === 11000) {
          user = (cleanGoogleId ? await userRepository.findByGoogleId(cleanGoogleId) : null) || (await userRepository.findByEmail(cleanEmail));
          if (!user) throw err;
          isNewUser = !user.isProfileComplete || (!user.firstName && !user.lastName);
        } else {
          throw err;
        }
      }
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

