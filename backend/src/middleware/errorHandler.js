const logger = require('../utils/logger');
const config = require('../config/config');

/**
 * Global error handling middleware
 * @param {Object} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {Object} - Error response
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error(`${err.name}: ${err.message}\nStack: ${err.stack}`);

  // Set default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server Error';
  
  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map(val => val.message);
    message = `Validation failed: ${errors.join(', ')}`;
  }
  
  // Handle mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate field value entered for ${field}. Please use another value.`;
  }
  
  // Handle mongoose cast error (invalid ID)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  }
  
  // Handle JWT expired error
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your token has expired. Please log in again.';
  }

  // Send response
  const errorResponse = {
    success: false,
    message,
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  };

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler; 