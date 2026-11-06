/**
 * Custom API Error Class
 */
class ApiError extends Error {
  constructor(statusCode, message = 'Something went wrong', errors = [], stack = '', data = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    this.data = data;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Bad Request', errors = [], data = null) {
    return new ApiError(400, message, errors, '', data);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource Not Found') {
    return new ApiError(404, message);
  }

  static internal(message = 'Internal Server Error', errors = []) {
    return new ApiError(500, message, errors);
  }
}

module.exports = ApiError;

