const express = require('express');
const {
  recordPutt,
  recordBatch,
  getHistory,
  getMetricsSummary,
  getRecordById,
  deleteRecord,
} = require('../controllers/putterRecord.controller');
const authenticateJwt = require('../middleware/auth.middleware');
const validate = require('../middleware/validator.middleware');
const {
  createPutterRecordSchema,
  batchCreatePutterRecordSchema,
  putterRecordQuerySchema,
} = require('../validations/putterRecord.validation');

const router = express.Router();

// All putter records endpoints require authentication
router.use(authenticateJwt);

// Summary & Aggregations (Top card on History screen)
router.get('/summary', validate(putterRecordQuerySchema, 'query'), getMetricsSummary);

// Offline bulk sync
router.post('/batch', validate(batchCreatePutterRecordSchema), recordBatch);

// Core CRUD routes
router
  .route('/')
  .get(validate(putterRecordQuerySchema, 'query'), getHistory)
  .post(validate(createPutterRecordSchema), recordPutt);

router
  .route('/:id')
  .get(getRecordById)
  .delete(deleteRecord);

module.exports = router;

