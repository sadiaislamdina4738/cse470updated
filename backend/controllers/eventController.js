const { validationResult } = require('express-validator');
const Event = require('../models/Event');
const User = require('../models/User');
const { emitEventUpdated: broadcastEventUpdated } = require('../utils/emitEventUpdated');

function attendeeCount(event) {
  return Array.isArray(event.attendees) ? event.attendees.length : 0;
}

function eventHasCapacity(event) {
  return attendeeCount(event) < event.maxAttendees;
}

async function emitEventUpdated(req, eventId) {
  await broadcastEventUpdated(req.app, eventId);
}

// Get all events with optional filtering
const getEvents = async (req, res) => {
  try {
    const { category, location, limit, q, from, to, sort } = req.query;

    // Build filter object
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (location) filter.location = new RegExp(location, 'i');
    if (q && String(q).trim()) {
      const term = String(q).trim();
      filter.$or = [
        { title: new RegExp(term, 'i') },
        { description: new RegExp(term, 'i') },
        { location: new RegExp(term, 'i') }
      ];
    }
    if (from) {
      filter.schedule = filter.schedule || {};
      filter.schedule.$gte = new Date(from);
    }
    if (to) {
      filter.schedule = filter.schedule || {};
      filter.schedule.$lte = new Date(to);
    }

    let sortSpec = { schedule: 1 };
    if (sort === 'schedule_desc') sortSpec = { schedule: -1 };
    else if (sort === 'created_desc') sortSpec = { createdAt: -1 };

    // Build query
    let query = Event.find(filter)
      .populate('creator', 'username')
      .populate('attendees', 'username')
      .populate('pendingRequests', 'username')
      .populate('waitlist', 'username');

    // Apply limit if specified
    if (limit && !isNaN(limit)) {
      query = query.limit(parseInt(limit));
    }

    const events = await query.sort(sortSpec);

    res.json({
      status: 'success',
      events
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch events'
    });
  }
};

// Create new event
const createEvent = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, description, category, location, coordinates, schedule, banner, maxAttendees, requiresApproval } = req.body;
    const creatorId = req.user._id;

    // Prepare event data
    const eventData = {
      title,
      description,
      category,
      location,
      schedule,
      creator: creatorId,
      banner,
      maxAttendees: maxAttendees || 100,
      requiresApproval: typeof requiresApproval === 'boolean' ? requiresApproval : true
    };

    // Only add coordinates if they exist and are valid
    if (coordinates && (coordinates.lat !== null || coordinates.lng !== null)) {
      eventData.coordinates = coordinates;
    }

    // Create new event
    const event = new Event(eventData);

    await event.save();

    // Update user's eventsCreated array
    await User.findByIdAndUpdate(
      creatorId,
      { $push: { eventsCreated: event._id } }
    );

    // Populate creator details
    const populatedEvent = await Event.findById(event._id)
      .populate('creator', 'username');

    res.status(201).json({
      status: 'success',
      message: 'Event created successfully',
      event: populatedEvent
    });

  } catch (error) {
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err) => ({
        msg: err.message,
        param: err.path
      }));

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    console.error('Create event error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create event'
    });
  }
};

// RSVP to event
const rsvpToEvent = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventId } = req.body;
    const userId = req.user._id;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    // Check if event is full
    if (event.isFull) {
      // Add to waitlist instead
      if (!event.waitlist.some((id) => id.toString() === userId.toString())) {
        const updatedEvent = await Event.findByIdAndUpdate(
          eventId,
          { $push: { waitlist: userId } },
          { new: true, runValidators: false }
        ).populate('creator', 'username');

        return res.json({
          status: 'success',
          message: 'Event is full. You have been added to the waitlist.',
          event: updatedEvent,
          waitlisted: true
        });
      } else {
        return res.status(400).json({
          status: 'error',
          message: 'You are already on the waitlist for this event'
        });
      }
    }

    // Check if user is already attending
    if (event.attendees.some((id) => id.toString() === userId.toString())) {
      return res.status(400).json({
        status: 'error',
        message: 'You are already attending this event'
      });
    }

    // Check if user has a pending request
    if (event.pendingRequests.some((id) => id.toString() === userId.toString())) {
      return res.status(400).json({
        status: 'error',
        message: 'You already have a pending request for this event'
      });
    }

    // Check if user is on waitlist
    if (event.waitlist.some((id) => id.toString() === userId.toString())) {
      return res.status(400).json({
        status: 'error',
        message: 'You are already on the waitlist for this event'
      });
    }

    // Check if event has passed
    if (event.schedule < new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot RSVP to past events'
      });
    }

    let updatedEvent;
    let message;

    if (event.requiresApproval) {
      // Add user to pending requests
      updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        { $push: { pendingRequests: userId } },
        { new: true, runValidators: false }
      ).populate('creator', 'username');

      message = 'Join request sent! Waiting for organizer approval.';
    } else {
      // Add user directly to attendees
      updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        { $push: { attendees: userId } },
        { new: true, runValidators: false }
      ).populate('creator', 'username');

      // Update user's eventsJoined array
      await User.findByIdAndUpdate(
        userId,
        { $push: { eventsJoined: eventId } }
      );

      message = 'Successfully RSVP\'d to event';
    }

    res.json({
      status: 'success',
      message,
      event: updatedEvent
    });

    await emitEventUpdated(req, eventId);

  } catch (error) {
    console.error('RSVP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to RSVP to event'
    });
  }
};

// Cancel RSVP / leave waitlist / withdraw pending request
const cancelRsvp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventId } = req.body;
    const userId = req.user._id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    const uid = userId.toString();
    const inAttendees = event.attendees.some((id) => id.toString() === uid);
    const inPending = event.pendingRequests.some((id) => id.toString() === uid);
    const inWaitlist = event.waitlist.some((id) => id.toString() === uid);

    if (!inAttendees && !inPending && !inWaitlist) {
      return res.status(400).json({
        status: 'error',
        message: 'You are not RSVP\'d or on the waitlist for this event'
      });
    }

    if (inAttendees) {
      event.attendees = event.attendees.filter((id) => id.toString() !== uid);
      await User.findByIdAndUpdate(userId, { $pull: { eventsJoined: eventId } });
    }
    if (inPending) {
      event.pendingRequests = event.pendingRequests.filter((id) => id.toString() !== uid);
    }
    if (inWaitlist) {
      event.waitlist = event.waitlist.filter((id) => id.toString() !== uid);
    }

    await event.save();

    const updatedEvent = await Event.findById(eventId)
      .populate('creator', 'username')
      .populate('attendees', 'username')
      .populate('pendingRequests', 'username')
      .populate('waitlist', 'username');

    res.json({
      status: 'success',
      message: 'RSVP cancelled successfully',
      event: updatedEvent
    });

    await emitEventUpdated(req, eventId);
  } catch (error) {
    console.error('Cancel RSVP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel RSVP'
    });
  }
};

// Public share URL for QR / deep linking
const getEventShareLink = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select('_id title isActive');
    if (!event || !event.isActive) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }
    const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const shareUrl = `${base}/events/${event._id}`;
    res.json({
      status: 'success',
      shareUrl,
      eventId: String(event._id),
      title: event.title
    });
  } catch (error) {
    console.error('Share link error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to build share link' });
  }
};

// Get single event by ID
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('creator', 'username')
      .populate('attendees', 'username')
      .populate('pendingRequests', 'username')
      .populate('waitlist', 'username');

    if (!event || !event.isActive) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    res.json({
      status: 'success',
      event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch event'
    });
  }
};

// Update event (creator only)
const updateEvent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ status: 'error', message: 'Event not found' });
    }

    if (event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'error', message: 'Only the event creator can update this event' });
    }

    const allowed = ['title', 'description', 'category', 'location', 'coordinates', 'schedule', 'banner', 'maxAttendees', 'requiresApproval', 'isActive'];
    allowed.forEach((key) => {
      if (req.body[key] === undefined) return;
      if (key === 'coordinates') {
        if (req.body.coordinates && (req.body.coordinates.lat != null || req.body.coordinates.lng != null)) {
          event.coordinates = req.body.coordinates;
        }
        return;
      }
      event[key] = req.body[key];
    });

    await event.save();

    const populated = await Event.findById(event._id)
      .populate('creator', 'username')
      .populate('attendees', 'username')
      .populate('pendingRequests', 'username')
      .populate('waitlist', 'username');

    res.json({
      status: 'success',
      message: 'Event updated successfully',
      event: populated
    });

    await emitEventUpdated(req, event._id);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err) => ({
        msg: err.message,
        param: err.path
      }));
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    console.error('Update event error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update event' });
  }
};

// Delete / deactivate event (creator only; admin uses separate route later)
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ status: 'error', message: 'Event not found' });
    }

    if (event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: 'error', message: 'Only the event creator can delete this event' });
    }

    event.isActive = false;
    await event.save();

    res.json({
      status: 'success',
      message: 'Event deleted successfully'
    });

    await emitEventUpdated(req, event._id);
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete event' });
  }
};

// Manage event attendees and requests
const manageAttendees = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventId, userId, action } = req.body;
    const creatorId = req.user._id;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    // Check if user is the creator
    if (event.creator.toString() !== creatorId.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Only event creator can manage attendees'
      });
    }

    let message = '';

    // Perform action
    if (action === 'approve') {
      // Approve a pending request
      if (event.pendingRequests.some((id) => id.toString() === userId.toString())) {
        if (!eventHasCapacity(event)) {
          return res.status(400).json({
            status: 'error',
            message: 'Event is full. Cannot approve more attendees.'
          });
        }
        // Remove from pending requests
        event.pendingRequests = event.pendingRequests.filter(id => id.toString() !== userId.toString());

        // Add to attendees
        if (!event.attendees.some((id) => id.toString() === userId.toString())) {
          event.attendees.push(userId);
          await User.findByIdAndUpdate(
            userId,
            { $push: { eventsJoined: eventId } }
          );
        }
        message = 'Request approved successfully';
      } else {
        return res.status(400).json({
          status: 'error',
          message: 'User does not have a pending request'
        });
      }
    } else if (action === 'reject') {
      // Reject a pending request
      if (event.pendingRequests.some((id) => id.toString() === userId.toString())) {
        event.pendingRequests = event.pendingRequests.filter(id => id.toString() !== userId.toString());
        message = 'Request rejected successfully';
      } else {
        return res.status(400).json({
          status: 'error',
          message: 'User does not have a pending request'
        });
      }
    } else if (action === 'remove') {
      // Remove from attendees
      event.attendees = event.attendees.filter(id => id.toString() !== userId.toString());
      await User.findByIdAndUpdate(
        userId,
        { $pull: { eventsJoined: eventId } }
      );

      // Promote someone from waitlist if available and capacity allows
      if (event.waitlist.length > 0 && eventHasCapacity(event)) {
        const promotedUser = event.waitlist.shift();
        event.attendees.push(promotedUser);
        await User.findByIdAndUpdate(
          promotedUser,
          { $push: { eventsJoined: eventId } }
        );
        message = 'Attendee removed and waitlist user promoted';
      } else {
        message = 'Attendee removed successfully';
      }
    } else if (action === 'promote-waitlist') {
      // Promote user from waitlist to attendees
      if (event.waitlist.some((id) => id.toString() === userId.toString())) {
        if (!eventHasCapacity(event)) {
          return res.status(400).json({
            status: 'error',
            message: 'Event is full. Cannot promote from waitlist.'
          });
        }
        event.waitlist = event.waitlist.filter(id => id.toString() !== userId.toString());
        if (!event.attendees.some((id) => id.toString() === userId.toString())) {
          event.attendees.push(userId);
          await User.findByIdAndUpdate(
            userId,
            { $push: { eventsJoined: eventId } }
          );
        }
        message = 'User promoted from waitlist successfully';
      } else {
        return res.status(400).json({
          status: 'error',
          message: 'User is not on the waitlist'
        });
      }
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid action. Use approve, reject, remove, or promote-waitlist'
      });
    }

    await event.save();

    // Populate the updated event
    const updatedEvent = await Event.findById(eventId)
      .populate('creator', 'username')
      .populate('attendees', 'username')
      .populate('pendingRequests', 'username')
      .populate('waitlist', 'username');

    res.json({
      status: 'success',
      message: message || 'Updated successfully',
      event: updatedEvent
    });

    await emitEventUpdated(req, eventId);

  } catch (error) {
    console.error('Manage attendees error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to manage attendees'
    });
  }
};

module.exports = {
  getEvents,
  createEvent,
  rsvpToEvent,
  cancelRsvp,
  getEventById,
  getEventShareLink,
  updateEvent,
  deleteEvent,
  manageAttendees
};
