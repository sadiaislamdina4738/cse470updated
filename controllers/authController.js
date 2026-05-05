const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const ErrorService = require('../services/errorService');

// Register new user
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ErrorService.validationError(res, errors);
    }

    const { email, username, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return ErrorService.conflict(res, 'User with this email or username already exists');
    }

    const initialAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || '').toLowerCase().trim();
    const role =
      initialAdminEmail && email.toLowerCase().trim() === initialAdminEmail ? 'admin' : 'user';

    // Create new user
    const user = new User({
      email,
      username,
      password,
      role
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    ErrorService.internal(res, 'Failed to register user', error);
  }
};

// Login user
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ErrorService.validationError(res, errors);
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return ErrorService.unauthorized(res, 'Invalid credentials');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return ErrorService.unauthorized(res, 'Invalid credentials');
    }

    if (user.isActive === false) {
      return ErrorService.unauthorized(res, 'Account has been deactivated');
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      status: 'success',
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    ErrorService.internal(res, 'Failed to login', error);
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId; // IMPORTANT (matches your JWT payload)

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ message: 'Server error deleting account' });
  }
};

module.exports = {
  register,
  login,
  deleteAccount
};
