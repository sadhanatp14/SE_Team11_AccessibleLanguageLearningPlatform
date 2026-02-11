
// Main server entry point for backend API
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();

// Enable CORS for cross-origin requests
app.use(cors());
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
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
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

// Start the server on the specified port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
