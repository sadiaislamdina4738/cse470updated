const express = require('express');
const { body } = require('express-validator');
const { register, login } = require('../controllers/authController');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// POST /api/auth/register - Register new user
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], register);

// POST /api/auth/login - Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], login);

// GET /api/auth/me - Get current user data
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('eventsCreated', 'title category location schedule createdAt')
      .populate('eventsJoined', 'title category location schedule createdAt');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user data'
    });
  }
});

module.exports = router;
