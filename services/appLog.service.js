const appLogRepository = require('../repositories/appLog.repository');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');

class AppLogService {
  /**
   * Helper to format a single log entry with network metadata & user ID
   */
  prepareLogEntry(entry, req) {
    const forwarded = req.headers ? req.headers['x-forwarded-for'] : null;
    const ipAddress = (forwarded ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress) || req.ip || null;
    const userAgent = req.headers ? req.headers['user-agent'] : null;

    const resolvedUserId = req.user ? req.user._id : entry.userId || null;

    return {
      userId: resolvedUserId,
      level: (entry.level || 'info').toLowerCase(),
      tag: (entry.tag || 'GENERAL').toUpperCase(),
      message: entry.message,
      context: entry.context || {},
      deviceInfo: entry.deviceInfo || {},
      error: entry.error || null,
      ipAddress,
      userAgent,
      timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
    };
  }

  /**
   * Record mobile app log(s) - Supports both single log and batch ingestion
   * @param {Object} req Express request
   * @param {Object} payload Ingested payload
   */
  async recordLog(req, payload) {
    // 1. Batch ingestion: { logs: [ ... ] }
    if (payload.logs && Array.isArray(payload.logs)) {
      if (payload.logs.length === 0) {
        throw ApiError.badRequest('Logs array cannot be empty');
      }

      const preparedBatch = payload.logs.map((item) => this.prepareLogEntry(item, req));
      const created = await appLogRepository.createBatch(preparedBatch);

      logger.debug(`Ingested batch of ${created.length} mobile application logs`);
      return {
        count: created.length,
        logs: created,
      };
    }

    // 2. Single log ingestion
    const preparedEntry = this.prepareLogEntry(payload, req);
    const created = await appLogRepository.create(preparedEntry);

    logger.debug(`Ingested mobile application log [${created.level.toUpperCase()} - ${created.tag}]: ${created.message}`);
    return created;
  }

  /**
   * Query and filter application logs for developer debugging
   */
  async getLogs(query = {}) {
    const filter = {};

    if (query.level) {
      filter.level = query.level.toLowerCase();
    }

    if (query.tag) {
      filter.tag = query.tag.toUpperCase();
    }

    if (query.userId) {
      filter.userId = query.userId;
    }

    if (query.platform) {
      filter['deviceInfo.platform'] = query.platform.toLowerCase();
    }

    if (query.deviceId) {
      filter['deviceInfo.deviceId'] = query.deviceId;
    }

    if (query.search) {
      filter.message = { $regex: query.search.trim(), $options: 'i' };
    }

    if (query.fromDate || query.toDate) {
      filter.timestamp = {};
      if (query.fromDate) {
        const start = new Date(query.fromDate);
        start.setHours(0, 0, 0, 0);
        filter.timestamp.$gte = start;
      }
      if (query.toDate) {
        const end = new Date(query.toDate);
        end.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = end;
      }
    }

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const skip = (page - 1) * limit;

    const [logs, totalRecords, stats] = await Promise.all([
      appLogRepository.findLogs(filter, { skip, limit, sort: { timestamp: -1 } }),
      appLogRepository.countLogs(filter),
      appLogRepository.getLogStats(),
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      stats,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      logs,
    };
  }

  /**
   * Get single application log detail by ID
   */
  async getLogById(id) {
    const log = await appLogRepository.findById(id);
    if (!log) {
      throw ApiError.notFound('Application log entry not found');
    }
    return log;
  }

  /**
   * Clear older application logs
   */
  async clearLogs(days = 30) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await appLogRepository.deleteOlderThan(cutoffDate);
    logger.info(`Cleared ${result.deletedCount} application logs older than ${days} days`);
    return {
      deletedCount: result.deletedCount,
      cutoffDate,
    };
  }
}

module.exports = new AppLogService();

