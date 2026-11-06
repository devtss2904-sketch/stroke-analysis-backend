const BaseRepository = require('./base.repository');
const Putter = require('../models/putter.model');

class PutterRepository extends BaseRepository {
  constructor() {
    super(Putter);
  }

  async findByUserId(userId, filter = {}) {
    return this.model
      .find({ userId, ...filter })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();
  }

  async findUserPutterById(userId, putterId) {
    return this.model.findOne({ _id: putterId, userId }).lean();
  }

  async countByUserId(userId, filter = {}) {
    return this.model.countDocuments({ userId, ...filter });
  }

  async findUserDefault(userId) {
    return this.model.findOne({ userId, isDefault: true, isActive: true }).lean();
  }

  async clearUserDefaultPutter(userId) {
    return this.model.updateMany({ userId, isDefault: true }, { isDefault: false });
  }

  async setDefaultPutter(userId, putterId) {
    // 1. Clear previous default
    await this.clearUserDefaultPutter(userId);
    // 2. Set new default
    return this.model.findOneAndUpdate(
      { _id: putterId, userId },
      { isDefault: true },
      { new: true, runValidators: true }
    ).lean();
  }

  async updateConnectionStatus(userId, putterId, statusData) {
    return this.model.findOneAndUpdate(
      { _id: putterId, userId },
      { $set: statusData },
      { new: true, runValidators: true }
    ).lean();
  }
}

module.exports = new PutterRepository();

