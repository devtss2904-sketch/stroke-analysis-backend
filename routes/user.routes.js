const express = require('express');
const {
  getMyProfile,
  updateMyProfile,
  uploadProfilePhoto,
} = require('../controllers/user.controller');
const authenticateJwt = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const validate = require('../middleware/validator.middleware');
const { updateProfileSchema } = require('../validations/user.validation');

const router = express.Router();

// All user profile routes require JWT authentication
router.use(authenticateJwt);

router.route('/profile')
  .get(getMyProfile)
  .put(validate(updateProfileSchema), updateMyProfile);

// Step 1: Upload profile photo
router.post('/profile/photo', upload.single('photo'), uploadProfilePhoto);

module.exports = router;

