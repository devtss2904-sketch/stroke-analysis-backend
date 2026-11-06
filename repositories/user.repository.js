const BaseRepository = require('./base.repository');
const User = require('../models/user.model');
const {
  normalizeEmail,
  normalizePhone,
  extractSignificantDigits,
} = require('../utils/normalize');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email) {
    const clean = normalizeEmail(email);
    if (!clean) return null;
    return this.findOne({ email: clean });
  }

  async findByPhone(phoneNumber) {
    const clean = normalizePhone(phoneNumber);
    if (!clean) return null;

    // 1. Direct match on normalized phone number
    let user = await this.findOne({ phoneNumber: clean });
    if (user) return user;

    // 2. Intelligent fallback: match by significant trailing 10 digits
    // (e.g. DB has "+919723001301" and incoming query is "9723001301", or vice versa)
    const digits = extractSignificantDigits(clean);
    if (digits && digits.length === 10) {
      user = await this.findOne({
        phoneNumber: { $regex: new RegExp(`${digits}$`) },
      });
      if (user) return user;
    }

    return null;
  }

  async findByGoogleId(googleId) {
    if (!googleId || typeof googleId !== 'string') return null;
    const clean = googleId.trim();
    if (!clean) return null;
    return this.findOne({ googleId: clean });
  }

  async findByIdentifier(identifier) {
    if (!identifier) return null;
    const isEmail = identifier.toString().includes('@');
    if (isEmail) {
      return this.findByEmail(identifier);
    }
    return this.findByPhone(identifier);
  }

  /**
   * Find another user account that conflicts on either email or phone
   * @param {Object} params
   * @param {string} [params.email]
   * @param {string} [params.phoneNumber]
   * @param {string|mongoose.Types.ObjectId} [params.excludeUserId]
   * @returns {Promise<Object|null>}
   */
  async findConflictingUser({ email, phoneNumber, excludeUserId = null }) {
    const conditions = [];

    const cleanEmail = normalizeEmail(email);
    if (cleanEmail) {
      conditions.push({ email: cleanEmail });
    }

    const cleanPhone = normalizePhone(phoneNumber);
    if (cleanPhone) {
      conditions.push({ phoneNumber: cleanPhone });
      const digits = extractSignificantDigits(cleanPhone);
      if (digits && digits.length === 10) {
        conditions.push({ phoneNumber: { $regex: new RegExp(`${digits}$`) } });
      }
    }

    if (conditions.length === 0) return null;

    const filter = { $or: conditions };
    if (excludeUserId) {
      filter._id = { $ne: excludeUserId };
    }

    return this.findOne(filter);
  }

  async updateLastLogin(id) {
    return this.updateById(id, { lastLoginAt: new Date() });
  }
}

module.exports = new UserRepository();
