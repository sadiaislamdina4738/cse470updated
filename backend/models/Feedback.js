const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  eventID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comments: {
    type: String,
    trim: true,
    maxlength: [500, 'Comments cannot exceed 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one feedback per user per event
feedbackSchema.index({ userID: 1, eventID: 1 }, { unique: true });

// Validate that event exists and has passed
feedbackSchema.pre('save', async function (next) {
  try {
    const Event = mongoose.model('Event');
    const event = await Event.findById(this.eventID);

    if (!event) {
      throw new Error('Event not found');
    }

    // Check if event has passed
    if (event.schedule > new Date()) {
      throw new Error('Cannot provide feedback for future events');
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
