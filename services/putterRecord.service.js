const putterRecordRepository = require('../repositories/putterRecord.repository');
const putterRepository = require('../repositories/putter.repository');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

class PutterRecordService {
  /**
   * Helper to resolve and validate putter ownership
   */
  async resolvePutter(userId, putterId) {
    if (putterId) {
      const putter = await putterRepository.findUserPutterById(userId, putterId);
      if (!putter) {
        throw ApiError.notFound('Specified putter not found or does not belong to your account');
      }
      return putter;
    }

    // Fallback to user's default active putter
    const defaultPutter = await putterRepository.findUserDefault(userId);
    if (defaultPutter) {
      return defaultPutter;
    }

    // Fallback to any active putter
    const userPutters = await putterRepository.findByUserId(userId, { isActive: true });
    if (!userPutters || userPutters.length === 0) {
      throw ApiError.badRequest('No registered putter found. Please add a putter first.');
    }

    return userPutters[0];
  }

  /**
   * Helper to extract the device JSON from incoming payload
   */
  extractDeviceData(recordData) {
    if (recordData.data && typeof recordData.data === 'object' && Object.keys(recordData.data).length > 0) {
      return recordData.data;
    }
    if (recordData.deviceData && typeof recordData.deviceData === 'object' && Object.keys(recordData.deviceData).length > 0) {
      return recordData.deviceData;
    }

    // Extract all dynamic properties other than putterId and recordedAt
    const { putterId, recordedAt, ...rest } = recordData;
    return rest;
  }

  /**
   * Store single putter device record
   * Stores userId, putterId, data (device JSON), and recordedAt
   */
  async recordPutt(userId, recordData) {
    const putter = await this.resolvePutter(userId, recordData.putterId);
    const deviceJson = this.extractDeviceData(recordData);

    const record = await putterRecordRepository.create({
      userId,
      putterId: putter._id,
      data: deviceJson,
      recordedAt: recordData.recordedAt ? new Date(recordData.recordedAt) : new Date(),
    });

    // Update putter lastConnectedAt and status
    const statusUpdate = {
      connectionStatus: 'connected',
      lastConnectedAt: new Date(),
    };
    if (deviceJson && typeof deviceJson.batteryLevel === 'number') {
      statusUpdate.batteryLevel = deviceJson.batteryLevel;
    }
    await putterRepository.updateConnectionStatus(userId, putter._id, statusUpdate);

    logger.info(`Putter record created for user ${userId} on putter ${putter.name} (${putter._id})`);
    return record;
  }

  /**
   * Bulk upload offline-buffered records
   */
  async recordBatch(userId, records) {
    if (!records || records.length === 0) {
      throw ApiError.badRequest('No records provided for batch upload');
    }

    const preparedRecords = [];
    for (const r of records) {
      const putter = await this.resolvePutter(userId, r.putterId);
      const deviceJson = this.extractDeviceData(r);

      preparedRecords.push({
        userId,
        putterId: putter._id,
        data: deviceJson,
        recordedAt: r.recordedAt ? new Date(r.recordedAt) : new Date(),
      });
    }

    const inserted = await putterRecordRepository.createBatch(preparedRecords);
    logger.info(`Batch uploaded ${inserted.length} putter records for user ${userId}`);

    return {
      count: inserted.length,
      records: inserted,
    };
  }

  /**
   * Build MongoDB query filter from query parameters
   */
  buildQueryFilter(userId, query = {}) {
    const filter = {};

    // Filter by Putter
    if (query.putterId) {
      filter.putterId = query.putterId;
    }

    // Filter by Date Range
    if (query.fromDate || query.toDate) {
      filter.recordedAt = {};
      if (query.fromDate) {
        const start = new Date(query.fromDate);
        start.setHours(0, 0, 0, 0);
        filter.recordedAt.$gte = start;
      }
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setHours(23, 59, 59, 999);
        filter.recordedAt.$lte = end;
      }
    }

    return filter;
  }

  /**
   * Get history of putter records with filters & pagination
   */
  async getHistory(userId, query = {}) {
    const filter = this.buildQueryFilter(userId, query);

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const sortBy = query.sortBy || 'recordedAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    const [records, totalRecords, summary] = await Promise.all([
      putterRecordRepository.findUserRecords(userId, filter, { skip, limit, sort }),
      putterRecordRepository.countUserRecords(userId, filter),
      putterRecordRepository.getMetricsSummary(userId, filter),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    // Retrieve active putter details if filtered by putter
    let selectedPutter = null;
    if (query.putterId) {
      selectedPutter = await putterRepository.findUserPutterById(userId, query.putterId);
    } else {
      selectedPutter = await putterRepository.findUserDefault(userId);
    }

    return {
      summary: {
        ...summary,
        selectedPutter: selectedPutter
          ? {
              id: selectedPutter._id,
              name: selectedPutter.name,
              putterType: selectedPutter.putterType,
              connectionType: selectedPutter.connectionType,
              isDefault: selectedPutter.isDefault,
            }
          : null,
      },
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      records,
    };
  }

  /**
   * Get aggregated summary
   */
  async getMetricsSummary(userId, query = {}) {
    const filter = this.buildQueryFilter(userId, query);
    const summary = await putterRecordRepository.getMetricsSummary(userId, filter);

    let selectedPutter = null;
    if (query.putterId) {
      selectedPutter = await putterRepository.findUserPutterById(userId, query.putterId);
    } else {
      selectedPutter = await putterRepository.findUserDefault(userId);
    }

    return {
      ...summary,
      selectedPutter: selectedPutter
        ? {
            id: selectedPutter._id,
            name: selectedPutter.name,
            putterType: selectedPutter.putterType,
            connectionType: selectedPutter.connectionType,
            isDefault: selectedPutter.isDefault,
          }
        : null,
    };
  }

  /**
   * Get single putter record by ID
   */
  async getRecordById(userId, recordId) {
    const record = await putterRecordRepository.findRecordById(userId, recordId);
    if (!record) {
      throw ApiError.notFound('Putter record not found or does not belong to your account');
    }
    return record;
  }

  /**
   * Delete a putter record
   */
  async deleteRecord(userId, recordId) {
    const deleted = await putterRecordRepository.deleteRecord(userId, recordId);
    if (!deleted) {
      throw ApiError.notFound('Putter record not found or does not belong to your account');
    }
    logger.info(`Putter record ${recordId} deleted by user ${userId}`);
    return deleted;
  }
}

module.exports = new PutterRecordService();
