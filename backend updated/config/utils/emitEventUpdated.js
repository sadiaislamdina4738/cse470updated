const Event = require('../models/Event');

/**
 * Broadcast populated event to Socket.io room `event-live-${eventId}`.
 * @param {import('express').Application} app
 * @param {string} eventId
 */
async function emitEventUpdated(app, eventId) {
  try {
    const io = app.get('io');
    if (!io || !eventId) return;
    const doc = await Event.findById(eventId)
      .populate('creator', 'username')
      .populate('attendees', 'username')
      .populate('pendingRequests', 'username')
      .populate('waitlist', 'username');
    if (doc) {
      io.to(`event-live-${String(eventId)}`).emit('event-updated', doc);
    }
  } catch (e) {
    console.error('emitEventUpdated error:', e);
  }
}

module.exports = { emitEventUpdated };
