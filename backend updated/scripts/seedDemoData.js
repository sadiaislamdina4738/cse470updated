require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Event = require('../models/Event');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventease';

async function seedDemoData() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB for demo seeding');

  // Clean up previous demo data only (safe, scoped by marker values).
  await Event.deleteMany({ title: { $regex: /^\[Demo\]/ } });
  await User.deleteMany({ email: { $regex: /@eventeasedemo\.com$/ } });

  const organizer = new User({
    username: 'demo_organizer',
    email: 'organizer@eventeasedemo.com',
    password: 'demo1234'
  });

  const attendee = new User({
    username: 'demo_attendee',
    email: 'attendee@eventeasedemo.com',
    password: 'demo1234'
  });

  const attendeeTwo = new User({
    username: 'demo_attendee2',
    email: 'attendee2@eventeasedemo.com',
    password: 'demo1234'
  });

  await organizer.save();
  await attendee.save();
  await attendeeTwo.save();

  const now = Date.now();
  const eventOne = new Event({
    title: '[Demo] MERN Sprint Planning Session',
    description: 'Sprint planning and task breakdown for CSE470.',
    category: 'Technology',
    location: 'BRACU Campus Room A-302',
    schedule: new Date(now + 2 * 24 * 60 * 60 * 1000),
    creator: organizer._id,
    attendees: [attendee._id, attendeeTwo._id],
    requiresApproval: true,
    maxAttendees: 100
  });

  const eventTwo = new Event({
    title: '[Demo] Local Startup Networking',
    description: 'Meet students and local founders for networking.',
    category: 'Business',
    location: 'Banani Community Center',
    schedule: new Date(now + 4 * 24 * 60 * 60 * 1000),
    creator: organizer._id,
    attendees: [attendee._id],
    requiresApproval: false,
    maxAttendees: 80
  });

  const eventThree = new Event({
    title: '[Demo] Study Jam and Project Showcase',
    description: 'Group study and live project showcase for junior batches.',
    category: 'Education',
    location: 'Online (Google Meet)',
    schedule: new Date(now + 6 * 24 * 60 * 60 * 1000),
    creator: organizer._id,
    attendees: [attendeeTwo._id],
    requiresApproval: false,
    maxAttendees: 150
  });

  await eventOne.save();
  await eventTwo.save();
  await eventThree.save();

  organizer.eventsCreated = [eventOne._id, eventTwo._id, eventThree._id];
  attendee.eventsJoined = [eventOne._id, eventTwo._id];
  attendeeTwo.eventsJoined = [eventOne._id, eventThree._id];

  await organizer.save();
  await attendee.save();
  await attendeeTwo.save();

  console.log('Demo seed complete');
  console.log('Demo logins:');
  console.log('- organizer@eventeasedemo.com / demo1234');
  console.log('- attendee@eventeasedemo.com / demo1234');
  console.log('- attendee2@eventeasedemo.com / demo1234');
}

seedDemoData()
  .catch((error) => {
    console.error('Demo seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  });
