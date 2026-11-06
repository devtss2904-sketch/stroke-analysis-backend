const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['email', 'phone'],
      required: true,
    },
    otp: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      enum: ['registration', 'login', 'verification'],
      default: 'registration',
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index: MongoDB auto-removes document once expiresAt is reached
    },
    resendAvailableAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// High-performance compound indexes for sub-millisecond OTP lookups & verification
otpSchema.index({ identifier: 1, isUsed: 1, expiresAt: 1, createdAt: -1 });
otpSchema.index({ identifier: 1, purpose: 1, isUsed: 1, createdAt: -1 });

const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;

