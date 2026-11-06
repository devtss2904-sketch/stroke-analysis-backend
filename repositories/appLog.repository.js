const BaseRepository = require('./base.repository');
const AppLog = require('../models/appLog.model');
require('../models/user.model');

class AppLogRepository extends BaseRepository {
  constructor() {
    super(AppLog);
  }

  async createBatch(logs) {
    return this.model.insertMany(logs);
  }

  async findLogs(filter = {}, options = {}) {
    const { skip = 0, limit = 50, sort = { timestamp: -1 } } = options;
    return this.model
      .find(filter)
      .populate('userId', 'email phoneNumber firstName lastName authProvider')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countLogs(filter = {}) {
    return this.model.countDocuments(filter);
  }

  async deleteOlderThan(date) {
    return this.model.deleteMany({ timestamp: { $lt: date } });
  }

  async getLogStats() {
    return this.model.aggregate([
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 },
          latestLog: { $max: '$timestamp' },
        },
      },
    ]);
  }
}

module.exports = new AppLogRepository();
