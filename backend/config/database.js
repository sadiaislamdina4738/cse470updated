const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/eventease', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    try {
      await User.updateMany(
        { $or: [{ role: { $exists: false } }, { role: null }] },
        { $set: { role: 'user' } }
      );
      await User.updateMany(
        { $or: [{ isActive: { $exists: false } }, { isActive: null }] },
        { $set: { isActive: true } }
      );
    } catch (migrationErr) {
      console.warn('User field migration (role/isActive):', migrationErr.message);
    }

    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
