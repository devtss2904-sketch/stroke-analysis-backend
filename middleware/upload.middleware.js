const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const ApiError = require('../utils/apiError');

// Strictly allowed image MIME types mapped to safe extensions
const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

// Storage configuration with safe extension enforcement
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const safeExt = ALLOWED_MIME_TYPES[(file.mimetype || '').toLowerCase()] || '.jpg';
    const randomHex = crypto.randomBytes(16).toString('hex');
    cb(null, `avatar-${Date.now()}-${randomHex}${safeExt}`);
  },
});

// File filter (accept images only and verify extension)
const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  const safeExt = ALLOWED_MIME_TYPES[mime];

  if (!safeExt) {
    return cb(ApiError.badRequest('Only image files (JPEG, PNG, WEBP) are allowed'), false);
  }

  // Also check original extension to prevent disguised executable uploads (e.g. payload.php.png)
  const originalExt = path.extname(file.originalname || '').toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  if (originalExt && !allowedExtensions.includes(originalExt)) {
    return cb(ApiError.badRequest('Invalid file extension for profile photo'), false);
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter,
});

module.exports = upload;
