const express = require('express');
const { body, query } = require('express-validator');
const { getEvents, createEvent, rsvpToEvent, manageAttendees } = require('../controllers/eventController');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/events - Get all events with optional filtering
router.get('/', [
  query('category').optional().trim(),
  query('location').optional().trim(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], getEvents);

// POST /api/events/create - Create new event
router.post('/create', auth, [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('coordinates.lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90'),
  body('coordinates.lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180'),
  body('schedule').isISO8601().withMessage('Valid date is required'),
  body('banner').optional({ checkFalsy: true }).trim().isURL().withMessage('Banner must be a valid URL'),
  body('maxAttendees').optional().isInt({ min: 1, max: 1000 }).withMessage('Max attendees must be between 1 and 1000')
], createEvent);

// POST /api/events/rsvp - RSVP to event
router.post('/rsvp', auth, [
  body('eventId').isMongoId().withMessage('Valid event ID is required')
], rsvpToEvent);

// PUT /api/events/manage-attendees - Manage event attendees
router.put('/manage-attendees', auth, [
  body('eventId').isMongoId().withMessage('Valid event ID is required'),
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('action').isIn(['approve', 'reject', 'remove', 'promote-waitlist']).withMessage('Action must be either "approve", "reject", "remove", or "promote-waitlist"')
], manageAttendees);

module.exports = router;
