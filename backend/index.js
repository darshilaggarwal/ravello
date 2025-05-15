const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Load config and utilities
const config = require('./src/config/config');
const connectDB = require('./src/config/database');
const { connectRedis } = require('./src/config/redis');
const logger = require('./src/utils/logger');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const errorHandler = require('./src/middleware/errorHandler');

// Route files
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const gameRoutes = require('./src/routes/games');

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Connect to Redis
connectRedis();

// Body parser with custom error handling
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid JSON payload',
        error: e.message
      });
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ extended: false }));

// Cookie parser
app.use(cookieParser());

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Security headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: config.isProduction 
    ? ['https://revello.onrender.com', 'https://revello-app.onrender.com'] 
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178', 'http://localhost:5179', 'http://localhost:5180'],
  credentials: true
}));

// Rate limiting
app.use('/api', apiLimiter);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);

// Serve frontend in production
if (config.isProduction) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
} else {
  // Health check route
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Server is running',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString()
    });
  });
}

// Error handling middleware
app.use(errorHandler);

// Handle unhandled routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: config.isProduction 
      ? 'https://revello.com' 
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178', 'http://localhost:5179', 'http://localhost:5180'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket.io middleware and event handlers
require('./src/socket')(io);

// Start server
const PORT = config.port;
httpServer.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});