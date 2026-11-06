const mongoose = require('mongoose');

const putterSchema = new mongoose.Schema(
  {
    // Owner of the putter
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Putter must belong to a user'],
      index: true,
    },

    // Screen: Get started 4
    name: {
      type: String,
      required: [true, 'Putter name is required'],
      trim: true,
      maxlength: [100, 'Putter name cannot exceed 100 characters'],
    },
    putterType: {
      type: String,
      required: [true, 'Putter type is required'],
      trim: true,
      maxlength: [100, 'Putter type cannot exceed 100 characters'],
    },

    // Connectivity & Hardware Device Info
    connectionType: {
      type: String,
      enum: ['bluetooth', 'ip', 'unknown'],
      default: 'bluetooth',
    },
    deviceId: {
      type: String,
      trim: true,
      default: null,
      sparse: true,
    },
    macAddress: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      match: [
        /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
        'Please provide a valid MAC address (e.g. AA:BB:CC:DD:EE:FF)',
      ],
    },
    ipAddress: {
      type: String,
      trim: true,
      default: null,
      match: [
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
        'Please provide a valid IPv4 address (e.g. 192.168.1.100)',
      ],
    },
    port: {
      type: Number,
      min: 1,
      max: 65535,
      default: null,
    },
    bluetoothName: {
      type: String,
      trim: true,
      default: null,
    },

    // Operational Status
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    connectionStatus: {
      type: String,
      enum: ['connected', 'disconnected', 'pairing'],
      default: 'disconnected',
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    firmwareVersion: {
      type: String,
      trim: true,
      default: null,
    },
    lastConnectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for querying user's putters
putterSchema.index({ userId: 1, isActive: 1 });
putterSchema.index({ userId: 1, isDefault: 1 });

const Putter = mongoose.model('Putter', putterSchema);

module.exports = Putter;

