const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
chatMessageSchema.index({ eventId: 1, createdAt: -1 });

// Populate user details when querying
chatMessageSchema.pre('find', function() {
  this.populate('userId', 'username');
});

chatMessageSchema.pre('findOne', function() {
  this.populate('userId', 'username');
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
