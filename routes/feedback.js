const express = require('express');
const { body } = require('express-validator');
const { submitFeedback, getEventFeedback } = require('../controllers/feedbackController');
const auth = require('../middleware/auth');
const router = express.Router();

// POST /api/events/feedback - Submit feedback for an event
router.post('/', auth, [
  body('eventId').isMongoId().withMessage('Valid event ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comments').optional().trim().isLength({ max: 500 }).withMessage('Comments cannot exceed 500 characters')
], submitFeedback);

// GET /api/events/feedback/:eventId - Get feedback for a specific event
router.get('/:eventId', getEventFeedback);

module.exports = router;
