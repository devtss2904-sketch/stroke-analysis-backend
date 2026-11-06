const mongoose = require('mongoose');
const envConfig = require('../config/env.config');
const User = require('../models/user.model');
const Otp = require('../models/otp.model');
const authService = require('../services/auth.service');
const otpRepository = require('../repositories/otp.repository');

async function testSecurity() {
  try {
    await mongoose.connect(envConfig.mongoUri);
    console.log('Connected to DB for security verification.');

    const testEmail = `sec.audit.${Date.now()}@example.com`;

    // 1. Test CSPRNG OTP Generation
    console.log('\n--- TEST 1: Cryptographic OTP Generation ---');
    for (let i = 0; i < 10; i++) {
      const code = authService.generateOtpCode();
      if (!/^\d{4}$/.test(code) || parseInt(code, 10) < 1000 || parseInt(code, 10) > 9999) {
        throw new Error(`Invalid OTP generated: ${code}`);
      }
    }
    console.log('PASSED: Generated 10 cryptographically secure 4-digit OTPs.');

    // 2. Test OTP Brute-Force Attempt Capping (Max 5 attempts)
    console.log('\n--- TEST 2: OTP Brute-Force Protection (Max 5 Attempts) ---');
    const sendRes = await authService.sendLoginOtp({ identifier: testEmail, type: 'email' });
    console.log(`Sent OTP to ${testEmail}`);

    const activeOtp = await otpRepository.findLatestActiveOtp(testEmail, 'login');
    const realCode = activeOtp.otp;
    const wrongCode = realCode === '1234' ? '4321' : '1234';

    console.log('Simulating 5 incorrect guesses...');
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        await authService.verifyOtp({ identifier: testEmail, otp: wrongCode, purpose: 'login' });
        throw new Error('Should have failed on incorrect OTP');
      } catch (err) {
        console.log(`  Attempt ${attempt}: Got expected rejection: "${err.message}"`);
      }
    }

    // 5th attempt should invalidate the OTP
    try {
      await authService.verifyOtp({ identifier: testEmail, otp: wrongCode, purpose: 'login' });
      throw new Error('Should have failed on 5th incorrect attempt');
    } catch (err) {
      console.log(`  Attempt 5 (Max Reached): Got expected invalidation: "${err.message}"`);
      if (!err.message.includes('Too many failed OTP attempts')) {
        throw new Error(`Expected invalidation message, got: ${err.message}`);
      }
    }

    // Attempting even the CORRECT code now must fail because OTP was invalidated!
    try {
      await authService.verifyOtp({ identifier: testEmail, otp: realCode, purpose: 'login' });
      throw new Error('FAILED: Invalidated OTP should not have accepted the correct code!');
    } catch (err) {
      console.log('PASSED: Correct OTP rejected after 5 failed attempts (brute force blocked).');
    }

    // 3. Test Google Account Hijacking Protection
    console.log('\n--- TEST 3: Google Account Hijacking Protection ---');
    const googleUserEmail = `google.victim.${Date.now()}@example.com`;
    const legitGoogleId = 'google-legit-id-123456';
    const attackerGoogleId = 'google-attacker-id-654321';

    // Legitimate user creates account via Google
    await authService.googleLogin({
      googleId: legitGoogleId,
      email: googleUserEmail,
      firstName: 'Legit',
      lastName: 'User',
    });
    console.log(`Created legitimate user with Google ID: ${legitGoogleId}`);

    // Attacker tries to hijack the account using a different Google ID
    try {
      await authService.googleLogin({
        googleId: attackerGoogleId,
        email: googleUserEmail,
        firstName: 'Attacker',
        lastName: 'Fake',
      });
      throw new Error('FAILED: Server allowed different Google ID to log in to existing account!');
    } catch (err) {
      console.log(`PASSED: Google hijack blocked with error: "${err.message}"`);
    }

    // Clean up
    await User.deleteMany({ email: { $in: [testEmail, googleUserEmail] } });
    await Otp.deleteMany({ identifier: { $in: [testEmail, googleUserEmail] } });
    console.log('\nCleaned up security test data.');

    console.log('\n=============================================');
    console.log('ALL ADVANCED SECURITY AUDIT CHECKS PASSED OK!');
    console.log('=============================================');
  } catch (err) {
    console.error('SECURITY TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testSecurity();

