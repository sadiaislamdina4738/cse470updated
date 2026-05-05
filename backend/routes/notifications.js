const express = require('express');
const { param } = require('express-validator');
const auth = require('../middleware/auth');
const {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/', auth, listNotifications);
router.get('/unread-count', auth, getUnreadCount);
router.patch('/read-all', auth, markAllAsRead);
router.patch('/:id/read', auth, [
  param('id').isMongoId().withMessage('Valid notification ID is required')
], markAsRead);

module.exports = router;
