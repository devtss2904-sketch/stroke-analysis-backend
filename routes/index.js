const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const putterRoutes = require('./putter.routes');
const putterRecordRoutes = require('./putterRecord.routes');
const ApiResponse = require('../utils/apiResponse');

const router = express.Router();

// Root API v1 status
router.get('/', (req, res) => {
  return ApiResponse.success(res, 'Makefield Mobile API v1 is operational', {
    service: 'Makefield Stroke Analysis Mobile Backend',
    version: '1.0.0',
    endpoints: {
      auth: {
        sendOtp: 'POST /api/v1/auth/send-otp',
        resendOtp: 'POST /api/v1/auth/resend-otp',
        verifyOtp: 'POST /api/v1/auth/verify-otp',
        googleLogin: 'POST /api/v1/auth/google',
      },
      users: {
        getProfile: 'GET /api/v1/users/profile',
        updateProfile: 'PUT /api/v1/users/profile',
        uploadPhoto: 'POST /api/v1/users/profile/photo',
      },
      putters: {
        createPutter: 'POST /api/v1/putters',
        listPutters: 'GET /api/v1/putters',
        getPutter: 'GET /api/v1/putters/:id',
        updatePutter: 'PUT /api/v1/putters/:id',
        deletePutter: 'DELETE /api/v1/putters/:id',
        setDefault: 'PATCH /api/v1/putters/:id/default',
        updateStatus: 'PATCH /api/v1/putters/:id/status',
      },
      putterRecords: {
        recordPutt: 'POST /api/v1/putter-records',
        recordBatch: 'POST /api/v1/putter-records/batch',
        getHistory: 'GET /api/v1/putter-records',
        getSummary: 'GET /api/v1/putter-records/summary',
        getRecord: 'GET /api/v1/putter-records/:id',
        deleteRecord: 'DELETE /api/v1/putter-records/:id',
      },
    },
  });
});

// Mount module routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/putters', putterRoutes);
router.use('/putter-records', putterRecordRoutes);

module.exports = router;
