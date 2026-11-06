const BaseRepository = require('./base.repository');
const Otp = require('../models/otp.model');

class OtpRepository extends BaseRepository {
  constructor() {
    super(Otp);
  }

  async findLatestActiveOtp(identifier, purpose) {
    const query = {
      identifier: identifier.toLowerCase().trim(),
      isUsed: false,
      expiresAt: { $gt: new Date() },
    };
    if (purpose) {
      query.purpose = purpose;
    }
    return this.model.findOne(query).sort({ createdAt: -1 });
  }

  async findMostRecent(identifier, purpose) {
    const query = {
      identifier: identifier.toLowerCase().trim(),
    };
    if (purpose) {
      query.purpose = purpose;
    }
    return this.model.findOne(query).sort({ createdAt: -1 });
  }

  async invalidatePreviousOtps(identifier, purpose) {
    const query = {
      identifier: identifier.toLowerCase().trim(),
      isUsed: false,
    };
    if (purpose) {
      query.purpose = purpose;
    }
    return this.model.updateMany(query, { isUsed: true });
  }

  async markAsUsed(id) {
    return this.model.findByIdAndUpdate(id, { isUsed: true }, { new: true });
  }
}

module.exports = new OtpRepository();

