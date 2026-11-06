const Joi = require('joi');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const singleLogSchema = Joi.object({
  level: Joi.string().valid('debug', 'info', 'warn', 'error', 'fatal').default('info'),
  tag: Joi.string().trim().max(50).default('GENERAL'),
  message: Joi.string().trim().required().messages({
    'string.empty': 'Log message is required',
    'any.required': 'Log message is required',
  }),
  context: Joi.object().unknown(true).optional(),
  deviceInfo: Joi.object({
    platform: Joi.string().trim().max(30).optional(),
    appVersion: Joi.string().trim().max(30).optional(),
    buildNumber: Joi.string().trim().max(30).optional(),
    osVersion: Joi.string().trim().max(30).optional(),
    deviceModel: Joi.string().trim().max(100).optional(),
    manufacturer: Joi.string().trim().max(100).optional(),
    network: Joi.string().trim().max(30).optional(),
    deviceId: Joi.string().trim().max(100).optional(),
  }).unknown(true).optional(),
  error: Joi.object({
    name: Joi.string().trim().optional(),
    message: Joi.string().trim().optional(),
    stack: Joi.string().allow('').optional(),
    code: Joi.any().optional(),
  }).unknown(true).optional(),
  userId: Joi.string().regex(objectIdRegex).optional(),
  timestamp: Joi.date().iso().optional(),
});

// Accepts either a single log object OR an object containing an array of logs: { logs: [...] }
const createLogSchema = Joi.alternatives().try(
  singleLogSchema,
  Joi.object({
    logs: Joi.array().items(singleLogSchema).min(1).max(200).required().messages({
      'array.min': 'Logs array must contain at least one log entry',
      'array.max': 'Cannot upload more than 200 log entries in a single request',
    }),
  })
);

const queryLogSchema = Joi.object({
  level: Joi.string().valid('debug', 'info', 'warn', 'error', 'fatal').optional(),
  tag: Joi.string().trim().max(50).optional(),
  userId: Joi.string().regex(objectIdRegex).optional(),
  platform: Joi.string().trim().max(30).optional(),
  deviceId: Joi.string().trim().max(100).optional(),
  search: Joi.string().trim().max(200).optional(),
  fromDate: Joi.date().iso().optional(),
  toDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

module.exports = {
  createLogSchema,
  queryLogSchema,
};

