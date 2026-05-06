const express = require('express');
const { body, query } = require('express-validator');
const { getChatMessages, sendMessage } = require('../controllers/chatController');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/events/chat - Get chat messages for an event (members only)
router.get('/', auth, [
  query('eventId').isMongoId().withMessage('Valid event ID is required')
], getChatMessages);

// POST /api/events/chat - Send message to event chat
router.post('/', auth, [
  body('eventId').isMongoId().withMessage('Valid event ID is required'),
  body('message').trim().isLength({ min: 1, max: 500 }).withMessage('Message must be between 1 and 500 characters')
], sendMessage);

module.exports = router;
