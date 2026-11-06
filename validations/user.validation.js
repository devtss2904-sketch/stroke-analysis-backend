const Joi = require('joi');

const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50).optional(),
  lastName: Joi.string().trim().min(1).max(50).optional(),
  birthday: Joi.date().iso().optional(),
  email: Joi.string().email().lowercase().trim().optional(),
  phoneNumber: Joi.string().trim().min(7).max(20).optional(),
  address: Joi.string().trim().max(200).allow('').optional(),
  city: Joi.string().trim().max(100).allow('').optional(),
  state: Joi.string().trim().max(100).allow('').optional(),
  zipCode: Joi.string().trim().max(20).allow('').optional(),
  profilePhoto: Joi.string().uri().allow('').optional(),
}).min(1);

module.exports = {
  updateProfileSchema,
};

