const mongoose = require('mongoose');
const envConfig = require('../config/env.config');
const AppLog = require('../models/appLog.model');
const appLogService = require('../services/appLog.service');

async function testAppLogs() {
  try {
    await mongoose.connect(envConfig.mongoUri);
    console.log('Connected to DB for App Log API testing.');

    // Mock Express request (unauthenticated)
    const mockUnauthReq = {
      headers: {
        'x-forwarded-for': '192.168.1.50',
        'user-agent': 'MakefieldApp/1.0.4 (iPhone15,2; iOS 17.4)',
      },
      ip: '192.168.1.50',
      user: null,
    };

    // Mock Express request (authenticated)
    const mockUserId = new mongoose.Types.ObjectId();
    const mockAuthReq = {
      headers: {
        'x-forwarded-for': '10.0.0.12',
        'user-agent': 'MakefieldApp/1.0.4 (Android 14; Pixel 8)',
      },
      ip: '10.0.0.12',
      user: {
        _id: mockUserId,
      },
    };

    console.log('\n--- TEST 1: Record single unauthenticated crash log ---');
    const log1 = await appLogService.recordLog(mockUnauthReq, {
      level: 'error',
      tag: 'BLE',
      message: 'Failed to connect to Makefield putter via Bluetooth LE: peripheral timed out',
      context: {
        macAddress: 'AA:BB:CC:11:22:33',
        retryCount: 3,
        serviceUuid: '0000ffe0-0000-1000-8000-00805f9b34fb',
      },
      deviceInfo: {
        platform: 'ios',
        appVersion: '1.0.4',
        osVersion: '17.4',
        deviceModel: 'iPhone 15 Pro',
        deviceId: 'device-uuid-test-111',
      },
      error: {
        name: 'BleTimeoutException',
        message: 'GATT connection timed out after 10000ms',
        stack: 'Error: GATT timeout\n at BleManager.connect (BleManager.ts:42)',
      },
    });

    console.log('Successfully recorded single log with ID:', log1._id);
    if (log1.userId !== null) throw new Error('Unauth log should have null userId');
    if (log1.tag !== 'BLE' || log1.level !== 'error') throw new Error('Field mismatch');

    console.log('\n--- TEST 2: Record single authenticated user log ---');
    const log2 = await appLogService.recordLog(mockAuthReq, {
      level: 'info',
      tag: 'PUTTER_TRACKING',
      message: 'Started live stroke tracking session',
      context: {
        putterId: '6ae98732f25fb30d7f6c5e5d',
        sessionMode: 'practice',
      },
      deviceInfo: {
        platform: 'android',
        appVersion: '1.0.4',
        deviceModel: 'Pixel 8',
        deviceId: 'device-uuid-test-222',
      },
    });

    console.log('Successfully recorded authenticated log with ID:', log2._id);
    if (!log2.userId || log2.userId.toString() !== mockUserId.toString()) {
      throw new Error('Authenticated log should have user ID attached');
    }

    console.log('\n--- TEST 3: Record batch of logs ---');
    const batchRes = await appLogService.recordLog(mockAuthReq, {
      logs: [
        {
          level: 'debug',
          tag: 'BLE_FRAME',
          message: 'Received BLE sensor packet [0x01, 0x4A, 0x22]',
        },
        {
          level: 'info',
          tag: 'STROKE_DETECTED',
          message: 'Putter stroke detected with impact speed 2.4 m/s',
        },
      ],
    });

    console.log(`Successfully ingested batch of ${batchRes.count} logs.`);
    if (batchRes.count !== 2) throw new Error('Batch count mismatch');

    console.log('\n--- TEST 4: Query logs with filters ---');
    const queryRes = await appLogService.getLogs({
      tag: 'BLE',
      level: 'error',
      limit: 10,
    });

    console.log(`Found ${queryRes.pagination.totalRecords} logs matching level=error & tag=BLE`);
    if (queryRes.logs.length === 0) throw new Error('Expected at least 1 log matching filter');
    console.log('Sample retrieved log:', {
      id: queryRes.logs[0]._id,
      level: queryRes.logs[0].level,
      tag: queryRes.logs[0].tag,
      message: queryRes.logs[0].message,
    });

    console.log('\n--- TEST 5: Get log by ID ---');
    const fetchedLog = await appLogService.getLogById(log1._id);
    if (fetchedLog._id.toString() !== log1._id.toString()) throw new Error('ID mismatch');
    console.log('Successfully retrieved log by ID:', fetchedLog._id);

    console.log('\n--- TEST 6: Check DB collection indexes (including TTL) ---');
    const indexes = await AppLog.collection.indexes();
    console.log('AppLog Collection Indexes:');
    indexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} (expireAfterSeconds: ${idx.expireAfterSeconds})`);
    });

    // Cleanup test logs
    await AppLog.deleteMany({
      _id: { $in: [log1._id, log2._id, ...batchRes.logs.map((l) => l._id)] },
    });
    console.log('\nCleaned up test logs.');

    console.log('\n=============================================');
    console.log('APPLICATION LOG API TESTS PASSED SUCCESSFULLY!');
    console.log('=============================================');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testAppLogs();

