const rateLimit = require('express-rate-limit');
const config = require('../config/config');

// Create a rate limiter for API endpoints
const apiLimiter = rateLimit({
  windowMs: parseInt(config.apiRateWindowMs), // 15 minutes by default
  max: parseInt(config.apiRateLimit), // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later',
  },
  skip: (req) => {
    // Skip rate limiting in development mode
    return config.nodeEnv === 'development';
  }
});

// Create a stricter rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
  skip: (req) => {
    // Skip rate limiting in development mode
    return config.nodeEnv === 'development';
  }
});

module.exports = {
  apiLimiter,
  authLimiter
}; 