// Response helper utilities for consistent API responses
class ResponseHelper {
  // Send success response
  static success(res, data = null, message = 'Success', statusCode = 200) {
    const response = {
      status: 'success',
      message
    };

    if (data) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  // Send created response
  static created(res, data = null, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  // Send updated response
  static updated(res, data = null, message = 'Resource updated successfully') {
    return this.success(res, data, message, 200);
  }

  // Send deleted response
  static deleted(res, message = 'Resource deleted successfully') {
    return this.success(res, null, message, 200);
  }

  // Send paginated response
  static paginated(res, data, page, limit, total) {
    return res.json({
      status: 'success',
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }
}

module.exports = ResponseHelper;
