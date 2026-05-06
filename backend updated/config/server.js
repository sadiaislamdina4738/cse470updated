const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const http = require('http');
const connectDB = require('./config/database');
const configureSocket = require('./config/socket');
const SocketService = require('./services/socketService');

// Load environment variables
dotenv.config({ path: '.env.example' });

const app = express();
const server = http.createServer(app);
const io = configureSocket(server);

// Initialize Socket.io service
const socketService = new SocketService(io);

// Middleware
const corsOriginEnv = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = corsOriginEnv.split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Database connection
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/events/chat', require('./routes/chat'));
app.use('/api/events/feedback', require('./routes/feedback'));
app.use('/api/events', require('./routes/events'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));

// Make io available to routes
app.set('io', io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };