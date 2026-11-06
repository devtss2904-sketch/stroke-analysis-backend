const BaseRepository = require('./base.repository');
const PutterRecord = require('../models/putterRecord.model');

class PutterRecordRepository extends BaseRepository {
  constructor() {
    super(PutterRecord);
  }

  async findUserRecords(userId, filter = {}, { skip = 0, limit = 20, sort = { recordedAt: -1 } } = {}) {
    return this.model
      .find({ userId, ...filter })
      .populate('putterId', 'name putterType connectionType isDefault')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countUserRecords(userId, filter = {}) {
    return this.model.countDocuments({ userId, ...filter });
  }

  async findRecordById(userId, recordId) {
    return this.model
      .findOne({ _id: recordId, userId })
      .populate('putterId', 'name putterType connectionType macAddress ipAddress isDefault')
      .lean();
  }

  async deleteRecord(userId, recordId) {
    return this.model.findOneAndDelete({ _id: recordId, userId }).lean();
  }

  async createBatch(records) {
    return this.model.insertMany(records);
  }

  /**
   * Get metrics summary for putter records
   */
  async getMetricsSummary(userId, filter = {}) {
    const mongoose = require('mongoose');
    const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    const matchStage = {
      userId: userObjId,
      ...filter,
    };

    if (filter.putterId && typeof filter.putterId === 'string') {
      matchStage.putterId = new mongoose.Types.ObjectId(filter.putterId);
    }

    const totalRecords = await this.model.countDocuments(matchStage);
    const latestRecord = await this.model.findOne(matchStage).sort({ recordedAt: -1 }).lean();

    return {
      totalRecords,
      totalPutts: totalRecords,
      lastRecordedAt: latestRecord ? latestRecord.recordedAt : null,
    };
  }
}

module.exports = new PutterRecordRepository();
