// Socket.io service for handling real-time communication
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');
const Event = require('../models/Event');
const { userCanAccessEventChat } = require('../utils/eventChatAccess');

class SocketService {
  constructor(io) {
    this.io = io;
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.use(async (socket, next) => {
      try {
        // Get token from handshake auth or query
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        // Attach user to socket
        socket.user = user;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.user.username, socket.id);

      socket.on('join-event-chat', async (eventId, ack) => {
        try {
          const event = await Event.findById(eventId);
          if (!event) {
            if (typeof ack === 'function') ack({ success: false, message: 'Event not found' });
            return;
          }
          if (!userCanAccessEventChat(event, socket.user._id)) {
            if (typeof ack === 'function') ack({ success: false, message: 'Access denied' });
            return;
          }
          socket.join(`event-chat-${eventId}`);
          console.log(`User ${socket.user.username} joined event chat: ${eventId}`);
          if (typeof ack === 'function') ack({ success: true });
        } catch (e) {
          console.error('join-event-chat error:', e);
          if (typeof ack === 'function') ack({ success: false, message: 'Failed to join chat' });
        }
      });

      socket.on('leave-event-chat', (eventId) => {
        socket.leave(`event-chat-${eventId}`);
        console.log(`User ${socket.user.username} left event chat: ${eventId}`);
      });

      socket.on('join-event-live', async (eventId, ack) => {
        try {
          const event = await Event.findById(eventId);
          if (!event || !event.isActive) {
            if (typeof ack === 'function') ack({ success: false, message: 'Event not found' });
            return;
          }
          socket.join(`event-live-${eventId}`);
          if (typeof ack === 'function') ack({ success: true });
        } catch (e) {
          console.error('join-event-live error:', e);
          if (typeof ack === 'function') ack({ success: false, message: 'Failed to subscribe' });
        }
      });

      socket.on('leave-event-live', (eventId) => {
        socket.leave(`event-live-${eventId}`);
      });

      socket.on('send-message', async (data, callback) => {
        try {
          // Validate the message data
          if (!data.eventId || !data.message || !data.message.trim()) {
            callback({ success: false, message: 'Invalid message data' });
            return;
          }

          // Check if event exists
          const event = await Event.findById(data.eventId);
          if (!event) {
            callback({ success: false, message: 'Event not found' });
            return;
          }

          if (!userCanAccessEventChat(event, socket.user._id)) {
            callback({ success: false, message: 'You do not have access to send messages in this event chat' });
            return;
          }

          // Join the event chat room if not already joined
          socket.join(`event-chat-${data.eventId}`);

          // Save message to database
          const chatMessage = new ChatMessage({
            eventId: data.eventId,
            userId: socket.user._id,
            message: data.message.trim()
          });

          await chatMessage.save();

          // Populate user details
          const populatedMessage = await ChatMessage.findById(chatMessage._id)
            .populate('userId', 'username');

          // Emit to everyone in the room including sender (matches REST broadcast)
          this.io.to(`event-chat-${data.eventId}`).emit('new-message', populatedMessage);

          callback({ success: true, message: 'Message sent successfully', data: populatedMessage });
        } catch (error) {
          console.error('Socket message error:', error);
          callback({ success: false, message: 'Failed to send message' });
        }
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.user?.username, socket.id);
      });
    });
  }

  // Method to emit messages to specific event rooms
  emitToEvent(eventId, eventName, data) {
    this.io.to(`event-chat-${eventId}`).emit(eventName, data);
  }

  // Method to get connected users in an event
  getEventUsers(eventId) {
    const room = this.io.sockets.adapter.rooms.get(`event-chat-${eventId}`);
    return room ? room.size : 0;
  }
}

module.exports = SocketService;
