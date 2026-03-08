
// Main server entry point for backend API
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();

// Enable CORS for cross-origin requests with production URLs
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5002',
    process.env.FRONTEND_URL || 'http://localhost:3000',
  ],
  credentials: true,
};
app.use(cors(corsOptions));
// Parse JSON request bodies
app.use(express.json());
// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[REQUEST] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// Connect to MongoDB using MONGODB_URI from environment
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Register API route handlers
app.use('/api/auth', require('./routes/auth')); // Authentication routes
app.use('/api/preferences', require('./routes/preferences')); // User preferences
app.use('/api/users', require('./routes/users')); // User management
app.use('/api/lessons', require('./routes/lessons')); // Lesson content
app.use('/api/interactions', require('./routes/interactions')); // User interactions
app.use('/api/progress', require('./routes/progress')); // Progress tracking
app.use('/api/ai', require('./routes/ai')); // AI features
app.use('/api/tts', require('./routes/tts')); // Text-to-speech
app.use('/api/admin', require('./routes/admin')); // Admin-specific management endpoints

// Enable dev-only routes if not in production
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', require('./routes/dev'));
  console.log('⚠️ Dev routes enabled: /api/dev');
}

// Health check endpoint (root)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Health check endpoint (API namespace)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running' });
});

// Global error handler for uncaught errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start the server on the specified port.
// If the configured port is busy, retry on the next port to avoid hard crashes.
const BASE_PORT = Number(process.env.PORT) || 5002;
const MAX_PORT_RETRIES = Number(process.env.PORT_RETRIES) || 10;

const startServer = (port, retriesLeft) => {
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
      const nextPort = port + 1;
      console.warn(
        `Port ${port} is already in use. Retrying on ${nextPort} (${retriesLeft} retries left)...`
      );
      setTimeout(() => startServer(nextPort, retriesLeft - 1), 250);
      return;
    }

    console.error(`Failed to start server on port ${port}:`, err.message);
    process.exit(1);
  });
};

startServer(BASE_PORT, MAX_PORT_RETRIES);
