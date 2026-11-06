const Joi = require('joi');

const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

const createPutterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': 'Putter name is required',
    'any.required': 'Putter name is required',
  }),
  putterType: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': 'Putter type is required',
    'any.required': 'Putter type is required',
  }),
  connectionType: Joi.string().valid('bluetooth', 'ip', 'unknown').default('bluetooth'),
  deviceId: Joi.string().trim().max(100).allow('').optional(),
  macAddress: Joi.string().trim().regex(macRegex).uppercase().optional().messages({
    'string.pattern.base': 'Please enter a valid MAC address (e.g. AA:BB:CC:DD:EE:FF)',
  }),
  ipAddress: Joi.string().ip({ version: ['ipv4'] }).optional().messages({
    'string.ip': 'Please enter a valid IPv4 address (e.g. 192.168.1.100)',
  }),
  port: Joi.number().integer().min(1).max(65535).optional(),
  bluetoothName: Joi.string().trim().max(100).allow('').optional(),
  isDefault: Joi.boolean().optional(),
});

const updatePutterSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  putterType: Joi.string().trim().min(1).max(100).optional(),
  connectionType: Joi.string().valid('bluetooth', 'ip', 'unknown').optional(),
  deviceId: Joi.string().trim().max(100).allow('').optional(),
  macAddress: Joi.string().trim().regex(macRegex).uppercase().allow(null, '').optional(),
  ipAddress: Joi.string().ip({ version: ['ipv4'] }).allow(null, '').optional(),
  port: Joi.number().integer().min(1).max(65535).allow(null).optional(),
  bluetoothName: Joi.string().trim().max(100).allow('').optional(),
  isDefault: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

const updateConnectionStatusSchema = Joi.object({
  connectionStatus: Joi.string().valid('connected', 'disconnected', 'pairing').optional(),
  batteryLevel: Joi.number().min(0).max(100).optional(),
  firmwareVersion: Joi.string().trim().max(50).optional(),
}).min(1);

module.exports = {
  createPutterSchema,
  updatePutterSchema,
  updateConnectionStatusSchema,
};

