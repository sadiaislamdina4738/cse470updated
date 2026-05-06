const Notification = require('../models/Notification');

async function createNotification({
  userId,
  eventId = null,
  type,
  title,
  message
}) {
  if (!userId || !type || !title || !message) return null;
  return Notification.create({
    user: userId,
    event: eventId || null,
    type,
    title,
    message
  });
}

module.exports = {
  createNotification
};
