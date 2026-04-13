const { validationResult } = require('express-validator');
const Event = require('../models/Event');
const User = require('../models/User');

// Get all events with optional filtering
const getEvents = async (req, res) => {
  try {
    const { category, location, limit } = req.query;

    // Build filter object
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (location) filter.location = new RegExp(location, 'i');

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

    const events = await query.sort({ schedule: 1 });

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

    const { title, description, category, location, coordinates, schedule, banner, maxAttendees } = req.body;
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
      maxAttendees: maxAttendees || 100
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
      if (!event.waitlist.includes(userId)) {
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
    if (event.attendees.includes(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'You are already attending this event'
      });
    }

    // Check if user has a pending request
    if (event.pendingRequests.includes(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'You already have a pending request for this event'
      });
    }

    // Check if user is on waitlist
    if (event.waitlist.includes(userId)) {
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

  } catch (error) {
    console.error('RSVP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to RSVP to event'
    });
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
      if (event.pendingRequests.includes(userId)) {
        // Remove from pending requests
        event.pendingRequests = event.pendingRequests.filter(id => id.toString() !== userId);

        // Add to attendees
        if (!event.attendees.includes(userId)) {
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
      if (event.pendingRequests.includes(userId)) {
        event.pendingRequests = event.pendingRequests.filter(id => id.toString() !== userId);
        message = 'Request rejected successfully';
      } else {
        return res.status(400).json({
          status: 'error',
          message: 'User does not have a pending request'
        });
      }
    } else if (action === 'remove') {
      // Remove from attendees
      event.attendees = event.attendees.filter(id => id.toString() !== userId);
      await User.findByIdAndUpdate(
        userId,
        { $pull: { eventsJoined: eventId } }
      );

      // Promote someone from waitlist if available
      if (event.waitlist.length > 0) {
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
      if (event.waitlist.includes(userId)) {
        event.waitlist = event.waitlist.filter(id => id.toString() !== userId);
        if (!event.attendees.includes(userId)) {
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
      message: `Attendee ${action === 'add' ? 'added' : 'removed'} successfully`,
      event
    });

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
  manageAttendees
};
