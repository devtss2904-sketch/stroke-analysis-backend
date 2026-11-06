const ApiError = require('../utils/apiError');

/**
 * Middleware factory to validate request body, query, or params with a Joi schema
 * @param {Object} schema Joi schema
 * @param {'body'|'query'|'params'} source Target object on request
 * @param {Object} [options] Custom Joi validation options
 */
const validate = (schema, source = 'body', options = {}) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      ...options,
    });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return next(ApiError.badRequest('Validation error', errorMessages));
    }

    req[source] = value;
    return next();
  };
};

module.exports = validate;

