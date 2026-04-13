const { validationResult, query } = require('express-validator');
const ChatMessage = require('../models/ChatMessage');
const Event = require('../models/Event');

// Get chat messages for an event
const getChatMessages = async (req, res) => {
  try {
    const { eventId } = req.query;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    // Get chat messages
    const messages = await ChatMessage.find({ eventId })
      .populate('userId', 'username')
      .sort({ createdAt: 1 })
      .limit(100); // Limit to last 100 messages

    res.json({
      status: 'success',
      messages
    });

  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch chat messages'
    });
  }
};

// Send message to event chat
const sendMessage = async (req, res) => {
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

    const { eventId, message } = req.body;
    const userId = req.user._id;


    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }


    // Check if user is attending, has pending request, or is on waitlist
    const isAttending = event.attendees.includes(userId);
    const hasPendingRequest = event.pendingRequests.includes(userId);
    const isOnWaitlist = event.waitlist.includes(userId);
    const isCreator = event.creator.toString() === userId.toString();

    if (!isAttending && !hasPendingRequest && !isOnWaitlist && !isCreator) {
      return res.status(403).json({
        status: 'error',
        message: 'You must be attending, have a pending request, or be the event creator to send messages'
      });
    }

    // Create chat message
    const chatMessage = new ChatMessage({
      eventId,
      userId,
      message
    });

    await chatMessage.save();

    // Populate user details
    const populatedMessage = await ChatMessage.findById(chatMessage._id)
      .populate('userId', 'username');

    // Emit message to all users in the event chat via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`event-${eventId}`).emit('new-message', populatedMessage);
    }

    res.status(201).json({
      status: 'success',
      message: 'Message sent successfully',
      chatMessage: populatedMessage
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message'
    });
  }
};

module.exports = {
  getChatMessages,
  sendMessage
};
