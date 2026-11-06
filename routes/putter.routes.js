const express = require('express');
const {
  createPutter,
  getUserPutters,
  getPutterById,
  updatePutter,
  deletePutter,
  setDefaultPutter,
  updateConnectionStatus,
} = require('../controllers/putter.controller');
const authenticateJwt = require('../middleware/auth.middleware');
const validate = require('../middleware/validator.middleware');
const {
  createPutterSchema,
  updatePutterSchema,
  updateConnectionStatusSchema,
} = require('../validations/putter.validation');

const router = express.Router();

// All putter endpoints require authentication
router.use(authenticateJwt);

router
  .route('/')
  .get(getUserPutters)
  .post(validate(createPutterSchema), createPutter);

router
  .route('/:id')
  .get(getPutterById)
  .put(validate(updatePutterSchema), updatePutter)
  .delete(deletePutter);

// Set primary / default putter
router.patch('/:id/default', setDefaultPutter);

// Live connection & battery sync (Bluetooth / IP)
router.patch('/:id/status', validate(updateConnectionStatusSchema), updateConnectionStatus);

module.exports = router;

