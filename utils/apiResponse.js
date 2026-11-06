/**
 * Standard API Response Structure
 */
class ApiResponse {
  constructor(statusCode, message = 'Success', data = null) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    if (data !== null && data !== undefined) {
      this.data = data;
    }
    this.timestamp = new Date().toISOString();
  }

  static success(res, message, data, statusCode = 200) {
    return res.status(statusCode).json(new ApiResponse(statusCode, message, data));
  }

  static created(res, message, data) {
    return res.status(201).json(new ApiResponse(201, message, data));
  }
}

module.exports = ApiResponse;

