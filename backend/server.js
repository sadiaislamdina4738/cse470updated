const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const http = require('http');
const connectDB = require('./config/database');
const configureSocket = require('./config/socket');
const SocketService = require('./services/socketService');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = configureSocket(server);

// Initialize Socket.io service
const socketService = new SocketService(io);

// Middleware
const corsOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(
  cors({
    origin: corsOrigin,
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

// Routes — mount `/api/events/chat` and `/api/events/feedback` BEFORE `/api/events`
// so `GET /api/events/chat` is not captured by `GET /api/events/:id` (id = "chat").
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events/chat', require('./routes/chat'));
app.use('/api/events/feedback', require('./routes/feedback'));
app.use('/api/events', require('./routes/events'));
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
