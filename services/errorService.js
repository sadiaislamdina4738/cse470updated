// Error handling service for consistent error responses
class ErrorService {
  // Send validation error response
  static validationError(res, errors) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  }

  // Send not found error response
  static notFound(res, message = 'Resource not found') {
    return res.status(404).json({
      status: 'error',
      message
    });
  }

  // Send unauthorized error response
  static unauthorized(res, message = 'Unauthorized access') {
    return res.status(401).json({
      status: 'error',
      message
    });
  }

  // Send forbidden error response
  static forbidden(res, message = 'Access forbidden') {
    return res.status(403).json({
      status: 'error',
      message
    });
  }

  // Send conflict error response
  static conflict(res, message = 'Resource conflict') {
    return res.status(409).json({
      status: 'error',
      message
    });
  }

  // Send internal server error response
  static internal(res, message = 'Internal server error', error = null) {
    if (error) {
      console.error('Internal server error:', error);
    }
    
    return res.status(500).json({
      status: 'error',
      message
    });
  }

  // Send bad request error response
  static badRequest(res, message = 'Bad request') {
    return res.status(400).json({
      status: 'error',
      message
    });
  }

  // Handle MongoDB errors
  static handleMongoError(res, error) {
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyValue)[0];
      return this.conflict(res, `${field} already exists`);
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return this.validationError(res, { array: () => errors });
    }
    
    return this.internal(res, 'Database operation failed', error);
  }
}

module.exports = ErrorService;
