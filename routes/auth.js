const express = require('express');
const { body } = require('express-validator');
const { register, login } = require('../controllers/authController');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();
const Event = require('../models/Event');

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
      .populate(
        'eventsCreated',
        'title description category location schedule createdAt isActive'
      )
      .populate(
        'eventsJoined',
        'title description category location schedule createdAt isActive'
      );

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

router.delete('/delete', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Delete all events created by user
    await Event.deleteMany({ creator: userId });

    // 2. Remove user from all events (attendees, waitlist, pendingRequests)
    await Event.updateMany(
      {},
      {
        $pull: {
          attendees: userId,
          waitlist: userId,
          pendingRequests: userId
        }
      }
    );

    // 3. Delete user
    await User.findByIdAndDelete(userId);

    res.json({
      status: 'success',
      message: 'User and all related data deleted'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete account'
    });
  }
});

module.exports = router;
