/**
 * Per SRS: chat access for creator, attendees, pending join requests, and waitlist.
 */
function userCanAccessEventChat(event, userId) {
  if (!event || !userId) return false;
  const uid = userId.toString();
  if (event.creator && event.creator.toString() === uid) return true;

  const lists = [event.attendees, event.pendingRequests, event.waitlist];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    if (list.some((id) => id.toString() === uid)) return true;
  }
  return false;
}

module.exports = { userCanAccessEventChat };
