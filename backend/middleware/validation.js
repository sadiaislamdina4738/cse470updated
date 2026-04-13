const { validationResult } = require('express-validator');

// Middleware to check for validation errors
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Common validation rules
const commonValidations = {
  mongoId: (field) => ({
    [field]: require('express-validator').body(field).isMongoId().withMessage(`Valid ${field} is required`)
  }),
  
  required: (field, minLength = 1, maxLength = 100) => ({
    [field]: require('express-validator').body(field)
      .trim()
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`)
  }),
  
  optional: (field, maxLength = 100) => ({
    [field]: require('express-validator').body(field)
      .optional()
      .trim()
      .isLength({ max: maxLength })
      .withMessage(`${field} cannot exceed ${maxLength} characters`)
  }),
  
  email: () => ({
    email: require('express-validator').body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email')
  }),
  
  password: (minLength = 6) => ({
    password: require('express-validator').body('password')
      .isLength({ min: minLength })
      .withMessage(`Password must be at least ${minLength} characters long`)
  })
};

module.exports = {
  validateRequest,
  commonValidations
};
