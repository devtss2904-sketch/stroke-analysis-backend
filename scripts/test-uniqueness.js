const mongoose = require('mongoose');
const envConfig = require('../config/env.config');
const User = require('../models/user.model');
const Otp = require('../models/otp.model');
const authService = require('../services/auth.service');
const userRepository = require('../repositories/user.repository');

async function runTests() {
  try {
    await mongoose.connect(envConfig.mongoUri);
    console.log('Connected to MongoDB for testing uniqueness...');

    const testEmail = `test.unique.${Date.now()}@example.com`;
    const testPhone = `+1999${Math.floor(1000000 + Math.random() * 9000000)}`;

    console.log(`\n--- TEST 1: sendLoginOtp creates 1st user (${testEmail}) ---`);
    const res1 = await authService.sendLoginOtp({ identifier: testEmail, type: 'email' });
    console.log('Result 1 isNewUser:', res1.isNewUser);

    console.log('\n--- TEST 2: sendLoginOtp called again with SAME email (uppercase + spaces) ---');
    // Clear cooldown for test 2
    await Otp.deleteMany({ identifier: testEmail });
    const res2 = await authService.sendLoginOtp({ identifier: `  ${testEmail.toUpperCase()}  `, type: 'email' });
    console.log('Result 2 isNewUser (should be false):', res2.isNewUser);

    const emailCount = await User.countDocuments({ email: testEmail });
    console.log(`Total users with email ${testEmail} in DB (should be 1):`, emailCount);
    if (emailCount !== 1) throw new Error('Duplicate email detected!');

    console.log('\n--- TEST 3: Direct MongoDB insert with DUPLICATE email must throw E11000 ---');
    try {
      await User.create({ email: testEmail, authProvider: 'email' });
      throw new Error('FAILED: MongoDB allowed duplicate email!');
    } catch (err) {
      if (err.code === 11000) {
        console.log('PASSED: MongoDB rejected duplicate email with E11000 code.');
      } else {
        throw err;
      }
    }

    console.log(`\n--- TEST 4: Phone login with format variations ---`);
    console.log(`Sending OTP to: ${testPhone}`);
    const phoneRes1 = await authService.sendLoginOtp({ identifier: testPhone, type: 'phone' });
    console.log('Phone Result 1 isNewUser:', phoneRes1.isNewUser);

    // Call again with spaces: e.g. +1 999 ...
    const formattedPhone = `${testPhone.slice(0, 2)} ${testPhone.slice(2, 5)} ${testPhone.slice(5)}`;
    console.log(`Sending OTP to formatted variant: "${formattedPhone}"`);
    // Clear cooldown for test
    await Otp.deleteMany({ identifier: testPhone });
    const phoneRes2 = await authService.sendLoginOtp({ identifier: formattedPhone, type: 'phone' });
    console.log('Phone Result 2 isNewUser (should be false):', phoneRes2.isNewUser);

    const phoneCount = await User.countDocuments({ phoneNumber: testPhone });
    console.log(`Total users with phone ${testPhone} in DB (should be 1):`, phoneCount);
    if (phoneCount !== 1) throw new Error('Duplicate phone detected!');

    console.log('\n--- TEST 5: Direct MongoDB insert with DUPLICATE phone must throw E11000 ---');
    try {
      await User.create({ phoneNumber: testPhone, authProvider: 'phone' });
      throw new Error('FAILED: MongoDB allowed duplicate phone!');
    } catch (err) {
      if (err.code === 11000) {
        console.log('PASSED: MongoDB rejected duplicate phone with E11000 code.');
      } else {
        throw err;
      }
    }

    console.log('\n--- TEST 6: Multiple users with NO email/phone should NOT collide ---');
    const placeholder1 = await User.create({ authProvider: 'google', firstName: 'GoogleTest1' });
    const placeholder2 = await User.create({ authProvider: 'google', firstName: 'GoogleTest2' });
    console.log('PASSED: Created 2 non-colliding users without email/phone/googleId.');
    await User.deleteMany({ _id: { $in: [placeholder1._id, placeholder2._id] } });

    console.log('\n--- Clean up test data ---');
    await User.deleteMany({ email: testEmail });
    await User.deleteMany({ phoneNumber: testPhone });
    await Otp.deleteMany({ identifier: { $in: [testEmail, testPhone] } });
    console.log('Test data cleaned up.');

    console.log('\n======================================================');
    console.log('ALL 6 UNIQUENESS & INTEGRITY TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();
