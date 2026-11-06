const BaseRepository = require('./base.repository');
const User = require('../models/user.model');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByEmail(email) {
    if (!email) return null;
    return this.findOne({ email: email.toLowerCase().trim() });
  }

  async findByPhone(phoneNumber) {
    if (!phoneNumber) return null;
    return this.findOne({ phoneNumber: phoneNumber.trim() });
  }

  async findByGoogleId(googleId) {
    if (!googleId) return null;
    return this.findOne({ googleId });
  }

  async findByIdentifier(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim();
    // Check if identifier looks like an email or phone
    const isEmail = clean.includes('@');
    if (isEmail) {
      return this.findByEmail(clean);
    }
    return this.findByPhone(clean);
  }

  async updateLastLogin(id) {
    return this.updateById(id, { lastLoginAt: new Date() });
  }
}

module.exports = new UserRepository();

