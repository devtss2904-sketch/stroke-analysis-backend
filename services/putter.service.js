const putterRepository = require('../repositories/putter.repository');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

class PutterService {
  /**
   * Add a new putter to the user's account
   */
  async createPutter(userId, putterData) {
    const existingCount = await putterRepository.countByUserId(userId, { isActive: true });

    // If it's the user's first putter, automatically make it the default putter
    let isDefault = putterData.isDefault !== undefined ? putterData.isDefault : existingCount === 0;

    if (isDefault) {
      await putterRepository.clearUserDefaultPutter(userId);
    }

    const putter = await putterRepository.create({
      ...putterData,
      userId,
      isDefault,
    });

    logger.info(`Putter '${putter.name}' (${putter._id}) added for user ${userId}`);
    return putter;
  }

  /**
   * Get all putters belonging to the authenticated user
   */
  async getUserPutters(userId, query = {}) {
    const filter = {};

    if (query.connectionType) {
      filter.connectionType = query.connectionType;
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true' || query.isActive === true;
    } else {
      filter.isActive = true;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search.trim(), $options: 'i' } },
        { putterType: { $regex: query.search.trim(), $options: 'i' } },
        { bluetoothName: { $regex: query.search.trim(), $options: 'i' } },
      ];
    }

    return putterRepository.findByUserId(userId, filter);
  }

  /**
   * Get a single putter by ID for the authenticated user
   */
  async getPutterById(userId, putterId) {
    const putter = await putterRepository.findUserPutterById(userId, putterId);
    if (!putter) {
      throw ApiError.notFound('Putter not found or does not belong to your account');
    }
    return putter;
  }

  /**
   * Update putter details
   */
  async updatePutter(userId, putterId, updateData) {
    const existing = await putterRepository.findUserPutterById(userId, putterId);
    if (!existing) {
      throw ApiError.notFound('Putter not found or does not belong to your account');
    }

    if (updateData.isDefault === true) {
      await putterRepository.clearUserDefaultPutter(userId);
    }

    const updated = await putterRepository.updateById(putterId, updateData);
    logger.info(`Putter ${putterId} updated by user ${userId}`);
    return updated;
  }

  /**
   * Delete a putter
   */
  async deletePutter(userId, putterId) {
    const existing = await putterRepository.findUserPutterById(userId, putterId);
    if (!existing) {
      throw ApiError.notFound('Putter not found or does not belong to your account');
    }

    await putterRepository.deleteById(putterId);
    logger.info(`Putter ${putterId} removed by user ${userId}`);

    // If deleted putter was default, promote another active putter to default
    if (existing.isDefault) {
      const remainingPutters = await putterRepository.findByUserId(userId, { isActive: true });
      if (remainingPutters.length > 0) {
        await putterRepository.setDefaultPutter(userId, remainingPutters[0]._id);
        logger.info(`Promoted putter ${remainingPutters[0]._id} to default for user ${userId}`);
      }
    }

    return existing;
  }

  /**
   * Set a putter as the user's primary/default putter
   */
  async setDefaultPutter(userId, putterId) {
    const existing = await putterRepository.findUserPutterById(userId, putterId);
    if (!existing) {
      throw ApiError.notFound('Putter not found or does not belong to your account');
    }

    const updated = await putterRepository.setDefaultPutter(userId, putterId);
    logger.info(`User ${userId} set putter ${putterId} as default`);
    return updated;
  }

  /**
   * Update putter live connection status (from mobile app BLE/IP sync)
   */
  async updateConnectionStatus(userId, putterId, statusData) {
    const existing = await putterRepository.findUserPutterById(userId, putterId);
    if (!existing) {
      throw ApiError.notFound('Putter not found or does not belong to your account');
    }

    const updateFields = { ...statusData };
    if (statusData.connectionStatus === 'connected') {
      updateFields.lastConnectedAt = new Date();
    }

    const updated = await putterRepository.updateConnectionStatus(userId, putterId, updateFields);
    return updated;
  }
}

module.exports = new PutterService();

