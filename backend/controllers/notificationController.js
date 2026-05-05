const Notification = require('../models/Notification');

const listNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate('event', '_id title')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      status: 'success',
      notifications
    });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch notifications' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });
    res.json({ status: 'success', unreadCount });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch unread count' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ status: 'error', message: 'Notification not found' });
    }
    res.json({ status: 'success', notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update notification' });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ status: 'success', message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update notifications' });
  }
};

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
