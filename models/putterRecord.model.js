const mongoose = require('mongoose');

const putterRecordSchema = new mongoose.Schema(
  {
    // Authenticated user who owns this record
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Putter record must belong to a user'],
      index: true,
    },

    // Associated putter device
    putterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Putter',
      required: [true, 'Record must be associated with a putter'],
      index: true,
    },

    // JSON payload received directly from the putter device
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Device JSON data is required'],
      default: {},
    },

    // Timestamp when the record occurred
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    strict: false, // Supports any dynamic device properties
  }
);

// Compound indexes for user history queries and filtering
putterRecordSchema.index({ userId: 1, recordedAt: -1 });
putterRecordSchema.index({ userId: 1, putterId: 1, recordedAt: -1 });

const PutterRecord = mongoose.model('PutterRecord', putterRecordSchema);

module.exports = PutterRecord;
