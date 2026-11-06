const Joi = require('joi');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Single putter device record schema
 * Accepts { putterId, data: { ... } } or { putterId, ...deviceJson }
 */
const singleRecordSchema = Joi.object({
  putterId: Joi.string().regex(objectIdRegex).optional().messages({
    'string.pattern.base': 'Invalid putter ID format',
  }),
  data: Joi.object().unknown(true).optional(),
  recordedAt: Joi.date().iso().default(Date.now),
}).unknown(true);

const createPutterRecordSchema = singleRecordSchema;

const batchCreatePutterRecordSchema = Joi.object({
  records: Joi.array().items(singleRecordSchema).min(1).max(100).required().messages({
    'array.min': 'At least one record is required for batch upload',
    'array.max': 'Cannot upload more than 100 records in a single batch',
    'any.required': 'Records array is required',
  }),
}).unknown(true);

const putterRecordQuerySchema = Joi.object({
  putterId: Joi.string().regex(objectIdRegex).optional().messages({
    'string.pattern.base': 'Invalid putter ID format',
  }),
  fromDate: Joi.date().iso().optional().messages({
    'date.format': 'fromDate must be a valid ISO date (YYYY-MM-DD)',
  }),
  toDate: Joi.date().iso().optional().messages({
    'date.format': 'toDate must be a valid ISO date (YYYY-MM-DD)',
  }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('recordedAt', 'createdAt').default('recordedAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

module.exports = {
  createPutterRecordSchema,
  batchCreatePutterRecordSchema,
  putterRecordQuerySchema,
};
