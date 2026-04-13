const { validationResult } = require('express-validator');
const Feedback = require('../models/Feedback');
const Event = require('../models/Event');

// Submit feedback for an event
const submitFeedback = async (req, res) => {
  try {
    console.log('Feedback submission attempt:', {
      userId: req.user._id,
      eventId: req.body.eventId,
      rating: req.body.rating,
      comments: req.body.comments,
      body: req.body
    });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventId, rating, comments } = req.body;
    const userId = req.user._id;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    // Check if user attended the event
    if (!event.attendees.some(attendee => attendee.toString() === userId.toString())) {
      return res.status(403).json({
        status: 'error',
        message: 'You must attend the event to provide feedback'
      });
    }

    // Check if event has passed
    if (event.schedule > new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot provide feedback for future events'
      });
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ userID: userId, eventID: eventId });
    if (existingFeedback) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already provided feedback for this event'
      });
    }

    // Create feedback
    const feedback = new Feedback({
      userID: userId,
      eventID: eventId,
      rating,
      comments
    });

    await feedback.save();

    res.status(201).json({
      status: 'success',
      message: 'Feedback submitted successfully',
      feedback
    });

  } catch (error) {
    console.error('Submit feedback error:', error);

    // Handle unique constraint violation
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already provided feedback for this event'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to submit feedback'
    });
  }
};

// Get feedback for a specific event
const getEventFeedback = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    // Get all feedback for the event
    const feedback = await Feedback.find({ eventID: eventId })
      .populate('userID', 'username')
      .sort({ createdAt: -1 });

    // Calculate average rating
    const totalRating = feedback.reduce((sum, item) => sum + item.rating, 0);
    const averageRating = feedback.length > 0 ? totalRating / feedback.length : 0;

    res.json({
      status: 'success',
      feedback,
      averageRating: Math.round(averageRating * 10) / 10,
      totalFeedback: feedback.length
    });

  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch feedback'
    });
  }
};

module.exports = {
  submitFeedback,
  getEventFeedback
};
