/**
 * Chat access for creator and approved attendees.
 */
function userCanAccessEventChat(event, userId) {
  if (!event || !userId) return false;
  const uid = userId.toString();
  const creatorId = typeof event.creator === 'object' ? (event.creator?._id || event.creator?.id) : event.creator;
  if (creatorId && creatorId.toString() === uid) return true;

  if (!Array.isArray(event.attendees)) return false;
  return event.attendees.some((attendee) => {
    const attendeeId = attendee?._id || attendee?.id || attendee;
    return attendeeId && attendeeId.toString() === uid;
  });
}

module.exports = { userCanAccessEventChat };
