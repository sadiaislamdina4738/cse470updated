const { validationResult } = require('express-validator');
const User = require('../models/User');
const Event = require('../models/Event');
const Feedback = require('../models/Feedback');
const { emitEventUpdated } = require('../utils/emitEventUpdated');

const listUsers = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', errors: errors.array() });
    }
    const { q, page = '1', limit = '20' } = req.query;
    const filter = {};
    if (q && String(q).trim()) {
      const term = String(q).trim();
      filter.$or = [
        { username: new RegExp(term, 'i') },
        { email: new RegExp(term, 'i') }
      ];
    }
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * lim;

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      User.countDocuments(filter)
    ]);

    res.json({
      status: 'success',
      users,
      total,
      page: pageNum,
      limit: lim
    });
  } catch (e) {
    console.error('admin listUsers', e);
    res.status(500).json({ status: 'error', message: 'Failed to list users' });
  }
};

const patchUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', errors: errors.array() });
    }
    const { isActive } = req.body;
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    if (target._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ status: 'error', message: 'You cannot change your own account this way' });
    }
    if (typeof isActive === 'boolean') {
      target.isActive = isActive;
    }
    await target.save();
    res.json({
      status: 'success',
      message: 'User updated',
      user: {
        id: target._id,
        username: target.username,
        email: target.email,
        role: target.role,
        isActive: target.isActive
      }
    });
  } catch (e) {
    console.error('admin patchUser', e);
    res.status(500).json({ status: 'error', message: 'Failed to update user' });
  }
};

const listEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate('creator', 'username')
      .populate('attendees', 'username')
      .populate('pendingRequests', 'username')
      .populate('waitlist', 'username')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({ status: 'success', events });
  } catch (e) {
    console.error('admin listEvents', e);
    res.status(500).json({ status: 'error', message: 'Failed to list events' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ status: 'error', message: 'Event not found' });
    }
    event.isActive = false;
    await event.save();
    await emitEventUpdated(req.app, event._id);
    res.json({ status: 'success', message: 'Event deactivated' });
  } catch (e) {
    console.error('admin deleteEvent', e);
    res.status(500).json({ status: 'error', message: 'Failed to delete event' });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const [
      userCount,
      activeUserCount,
      eventCount,
      activeEventCount,
      feedbackCount,
      avgRatingAgg,
      rsvpAgg
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Event.countDocuments(),
      Event.countDocuments({ isActive: true }),
      Feedback.countDocuments(),
      Feedback.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
      Event.aggregate([
        {
          $project: {
            slots: {
              $add: [
                { $size: { $ifNull: ['$attendees', []] } },
                { $size: { $ifNull: ['$pendingRequests', []] } },
                { $size: { $ifNull: ['$waitlist', []] } }
              ]
            }
          }
        },
        { $group: { _id: null, total: { $sum: '$slots' } } }
      ])
    ]);

    const avgRating = avgRatingAgg[0]?.avg != null ? Math.round(avgRatingAgg[0].avg * 10) / 10 : 0;
    const totalRsvpSlots = rsvpAgg[0]?.total ?? 0;

    res.json({
      status: 'success',
      analytics: {
        users: userCount,
        activeUsers: activeUserCount,
        events: eventCount,
        activeEvents: activeEventCount,
        feedbackEntries: feedbackCount,
        averageRating: avgRating,
        totalRsvpSlots
      }
    });
  } catch (e) {
    console.error('admin getAnalytics', e);
    res.status(500).json({ status: 'error', message: 'Failed to load analytics' });
  }
};

module.exports = {
  listUsers,
  patchUser,
  listEvents,
  deleteEvent,
  getAnalytics
};
