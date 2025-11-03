const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config({
  debug: false,
  override: true
});

const { testConnection } = require('./src/config/database');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const workerRoutes = require('./src/routes/workerRoutes');
const seekerRoutes = require('./src/routes/seekerRoutes');
const reviewRoutes = require('./src/routes/reviewRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const disputeRoutes = require('./src/routes/disputeRoutes');
const referralRoutes = require('./src/routes/referralRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const jobRoutes = require('./src/routes/jobRoutes');

// Initialize express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

app.use('/api/', limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
  // Response logger prints outgoing JSON/send bodies (development only)
  try {
    const responseLogger = require('./src/middleware/responseLogger');
    app.use(responseLogger);
  } catch (err) {
    console.warn('Could not attach responseLogger middleware:', err.message);
  }
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Worker Finder API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/seekers', seekerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/jobs', jobRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Worker Finder API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      workers: '/api/workers',
      seekers: '/api/seekers',
      reviews: '/api/reviews',
      messages: '/api/messages',
      disputes: '/api/disputes',
      referrals: '/api/referrals',
      categories: '/api/categories'
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }
    
    // Start listening
    app.listen(PORT, () => {
      console.log('');
      console.log('='.repeat(60));
      console.log('🚀 Worker Finder Backend API');
      console.log('='.repeat(60));
      console.log(`📡 Server running on: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Database: ${process.env.DB_NAME}`);
      console.log(`☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? '✅ Configured' : '❌ Not configured'}`);
      console.log('='.repeat(60));
      console.log('📚 API Endpoints:');
      console.log('   - Health Check: GET /health');
      console.log('   - Authentication: /api/auth/*');
      console.log('   - Workers: /api/workers/*');
      console.log('   - Seekers: /api/seekers/*');
      console.log('   - Reviews: /api/reviews/*');
      console.log('   - Messages: /api/messages/*');
      console.log('   - Disputes: /api/disputes/*');
      console.log('   - Referrals: /api/referrals/*');
      console.log('   - Categories: /api/categories/*');
      console.log('='.repeat(60));
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

// module.exports = app;
