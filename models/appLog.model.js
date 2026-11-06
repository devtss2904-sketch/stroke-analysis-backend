const mongoose = require('mongoose');

const appLogSchema = new mongoose.Schema(
  {
    // Authenticated user (if logged in, otherwise null)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // Severity level
    level: {
      type: String,
      enum: ['debug', 'info', 'warn', 'error', 'fatal'],
      default: 'info',
      index: true,
    },

    // Module / feature tag (e.g. 'BLE', 'AUTH', 'PUTTER_TRACKING', 'NETWORK', 'GENERAL')
    tag: {
      type: String,
      trim: true,
      default: 'GENERAL',
      index: true,
    },

    // Main log description
    message: {
      type: String,
      required: [true, 'Log message is required'],
      trim: true,
    },

    // Context / parameters / state dump
    context: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Device telemetry
    deviceInfo: {
      platform: { type: String, trim: true }, // 'ios', 'android', 'web'
      appVersion: { type: String, trim: true },
      buildNumber: { type: String, trim: true },
      osVersion: { type: String, trim: true },
      deviceModel: { type: String, trim: true },
      manufacturer: { type: String, trim: true },
      network: { type: String, trim: true },
      deviceId: { type: String, trim: true, index: true },
    },

    // Detailed error trace if logged from a catch block
    error: {
      name: { type: String },
      message: { type: String },
      stack: { type: String },
      code: { type: mongoose.Schema.Types.Mixed },
    },

    // Network metadata
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },

    // Explicit timestamp recorded by client device
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// High performance compound indexes for developer querying & debugging
appLogSchema.index({ level: 1, timestamp: -1 });
appLogSchema.index({ tag: 1, timestamp: -1 });
appLogSchema.index({ userId: 1, timestamp: -1 });
appLogSchema.index({ 'deviceInfo.deviceId': 1, timestamp: -1 });

// TTL index: auto-delete logs older than 30 days to prevent disk bloat (30 days = 2592000 seconds)
appLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const AppLog = mongoose.model('AppLog', appLogSchema);

module.exports = AppLog;

