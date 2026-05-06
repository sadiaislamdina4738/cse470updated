const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Event category is required'],
    enum: ['Technology', 'Business', 'Education', 'Entertainment', 'Sports', 'Health', 'Other'],
    default: 'Other'
  },
  location: {
    type: String,
    required: [true, 'Event location is required'],
    trim: true
  },
  coordinates: {
    lat: {
      type: Number,
      required: false,
      default: undefined
    },
    lng: {
      type: Number,
      required: false,
      default: undefined
    }
  },
  schedule: {
    type: Date,
    required: [true, 'Event schedule is required'],
    validate: {
      validator: function (value) {
        return value > new Date();
      },
      message: 'Event schedule must be in the future'
    }
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Event creator is required']
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  pendingRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  waitlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  requiresApproval: {
    type: Boolean,
    default: true
  },
  banner: {
    type: String,
    default: null
  },
  maxAttendees: {
    type: Number,
    min: [1, 'Maximum attendees must be at least 1'],
    default: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  paymentRequired: {
  type: Boolean,
  default: true
  },
  paymentLink: { type: String, default: '' }, paidUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' 
  }]
});

// Index for efficient queries
eventSchema.index({ schedule: 1, location: 1, category: 1 });
eventSchema.index({ creator: 1 });

// Virtual for checking if event is full
eventSchema.virtual('isFull').get(function () {
  const attendeeCount = Array.isArray(this.attendees) ? this.attendees.length : 0;
  return attendeeCount >= this.maxAttendees;
});

// Virtual for checking if event has passed
eventSchema.virtual('hasPassed').get(function () {
  return this.schedule < new Date();
});

// Ensure virtual fields are serialized
eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);
