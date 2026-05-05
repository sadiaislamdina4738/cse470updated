const express = require('express');
const { query, param, body } = require('express-validator');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/admin');
const {
  listUsers,
  patchUser,
  listEvents,
  deleteEvent,
  getAnalytics
} = require('../controllers/adminController');

const router = express.Router();

router.use(auth, adminOnly);

router.get('/users', [
  query('q').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], listUsers);

router.patch('/users/:id', [
  param('id').isMongoId(),
  body('isActive').isBoolean().withMessage('isActive must be boolean')
], patchUser);

router.get('/events', listEvents);

router.delete('/events/:id', [
  param('id').isMongoId()
], deleteEvent);

router.get('/analytics', getAnalytics);

module.exports = router;
