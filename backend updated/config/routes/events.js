const express = require('express');
const { body, query, param } = require('express-validator');
const {
  getEvents,
  createEvent,
  rsvpToEvent,
  cancelRsvp,
  getEventById,
  getEventShareLink,
  updateEvent,
  deleteEvent,
  manageAttendees
} = require('../controllers/eventController');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/events - Get all events with optional filtering
router.get('/', [
  query('category').optional().trim(),
  query('location').optional().trim(),
  query('q').optional().trim(),
  query('from').optional().isISO8601().withMessage('from must be ISO8601 date'),
  query('to').optional().isISO8601().withMessage('to must be ISO8601 date'),
  query('sort').optional().isIn(['schedule_asc', 'schedule_desc', 'created_desc']).withMessage('Invalid sort'),
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
  body('maxAttendees').optional().isInt({ min: 1, max: 1000 }).withMessage('Max attendees must be between 1 and 1000'),
  body('requiresApproval').optional().isBoolean().withMessage('requiresApproval must be boolean')
], createEvent);

// POST /api/events/rsvp - RSVP to event
router.post('/rsvp', auth, [
  body('eventId').isMongoId().withMessage('Valid event ID is required')
], rsvpToEvent);

// POST /api/events/cancel-rsvp - Cancel RSVP / leave waitlist / withdraw pending
router.post('/cancel-rsvp', auth, [
  body('eventId').isMongoId().withMessage('Valid event ID is required')
], cancelRsvp);

// PUT /api/events/manage-attendees - Manage event attendees
router.put('/manage-attendees', auth, [
  body('eventId').isMongoId().withMessage('Valid event ID is required'),
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('action').isIn(['approve', 'reject', 'remove', 'promote-waitlist']).withMessage('Action must be either "approve", "reject", "remove", or "promote-waitlist"')
], manageAttendees);


// GET /api/events/:id/share-link — canonical deep link (must be before /:id)
router.get('/:id/share-link', [
  param('id').isMongoId().withMessage('Valid event ID is required')
], getEventShareLink);

// GET /api/events/:id - Single event
router.get('/:id', [
  param('id').isMongoId().withMessage('Valid event ID is required')
], getEventById);

// PUT /api/events/:id - Update event (creator)
router.put('/:id', auth, [
  param('id').isMongoId().withMessage('Valid event ID is required'),
  body('title').optional().trim().isLength({ min: 3, max: 100 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('category').optional().trim().notEmpty(),
  body('location').optional().trim().notEmpty(),
  body('coordinates.lat').optional().isFloat({ min: -90, max: 90 }),
  body('coordinates.lng').optional().isFloat({ min: -180, max: 180 }),
  body('schedule').optional().isISO8601(),
  body('banner').optional({ checkFalsy: true }).trim().isURL(),
  body('maxAttendees').optional().isInt({ min: 1, max: 1000 }),
  body('requiresApproval').optional().isBoolean(),
  body('isActive').optional().isBoolean()
], updateEvent);

// DELETE /api/events/:id - Soft-delete (creator)
router.delete('/:id', auth, [
  param('id').isMongoId().withMessage('Valid event ID is required')
], deleteEvent);

module.exports = router;
