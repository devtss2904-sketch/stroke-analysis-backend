const userRepository = require('../repositories/user.repository');
const ApiError = require('../utils/apiError');
const envConfig = require('../config/env.config');

class UserService {
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  async updateProfile(userId, updateData) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // 1. Enforce Registration Identifier Immutability:
    // - If user registered using Email (or Google), the email field cannot be changed.
    // - If user registered using Phone Number, the phone number field cannot be changed.
    if ((user.authProvider === 'email' || user.authProvider === 'google') && updateData.email !== undefined) {
      const incomingEmail = (updateData.email || '').toLowerCase().trim();
      const registeredEmail = (user.email || '').toLowerCase().trim();
      if (incomingEmail !== registeredEmail) {
        throw ApiError.badRequest('Your registration email address cannot be changed');
      }
      // If same, delete to avoid redundant DB update / unique check
      delete updateData.email;
    }

    if (user.authProvider === 'phone' && updateData.phoneNumber !== undefined) {
      const incomingPhone = (updateData.phoneNumber || '').trim();
      const registeredPhone = (user.phoneNumber || '').trim();
      if (incomingPhone !== registeredPhone) {
        throw ApiError.badRequest('Your registration phone number cannot be changed');
      }
      // If same, delete to avoid redundant DB update / unique check
      delete updateData.phoneNumber;
    }

    // 2. Uniqueness check for email (e.g. secondary email added/updated by a phone-registered user)
    if (updateData.email) {
      const cleanEmail = updateData.email.toLowerCase().trim();
      if (cleanEmail !== (user.email || '').toLowerCase().trim()) {
        const existing = await userRepository.findByEmail(cleanEmail);
        if (existing && existing._id.toString() !== userId.toString()) {
          throw ApiError.badRequest('Email is already registered by another account');
        }
        updateData.email = cleanEmail;
      } else {
        delete updateData.email;
      }
    }

    // 3. Uniqueness check for phone number (e.g. secondary phone added/updated by an email-registered user)
    if (updateData.phoneNumber) {
      const cleanPhone = updateData.phoneNumber.trim();
      if (cleanPhone !== (user.phoneNumber || '').trim()) {
        const existing = await userRepository.findByPhone(cleanPhone);
        if (existing && existing._id.toString() !== userId.toString()) {
          throw ApiError.badRequest('Phone number is already registered by another account');
        }
        updateData.phoneNumber = cleanPhone;
      } else {
        delete updateData.phoneNumber;
      }
    }

    if (updateData.birthday) {
      updateData.birthday = new Date(updateData.birthday);
    }

    // Check if profile completeness changed
    const firstName = updateData.firstName !== undefined ? updateData.firstName : user.firstName;
    const lastName = updateData.lastName !== undefined ? updateData.lastName : user.lastName;
    updateData.isProfileComplete = Boolean(firstName && lastName);

    const updatedUser = await userRepository.updateById(userId, updateData);
    return updatedUser;
  }

  async updateProfilePhoto(userId, relativeFilePath) {
    const fullPhotoUrl = `${envConfig.appBaseUrl}/${relativeFilePath.replace(/\\/g, '/')}`;
    const updatedUser = await userRepository.updateById(userId, {
      profilePhoto: fullPhotoUrl,
    });

    if (!updatedUser) {
      throw ApiError.notFound('User not found');
    }

    return {
      photoUrl: fullPhotoUrl,
      user: updatedUser,
    };
  }
}

module.exports = new UserService();

