const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const config = require('../config/config');
const logger = require('../utils/logger');

// Middleware to protect routes - requires authentication
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // 1) Check if token exists in headers or cookies
    if (
      req.headers.authorization && 
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Extract token from Bearer token in header
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      // Extract token from cookie
      token = req.cookies.jwt;
    }
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'You are not logged in. Please log in to get access.' 
      });
    }
    
    // 2) Verify token
    const decoded = await promisify(jwt.verify)(token, config.jwtSecret);
    
    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'The user belonging to this token no longer exists.' 
      });
    }
    
    // 4) Add user to request object
    req.user = currentUser;
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized to access this route' 
    });
  }
};

// Middleware to restrict access based on user roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to perform this action' 
      });
    }
    next();
  };
};

// Middleware to refresh token
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'No refresh token provided' 
      });
    }
    
    // Verify refresh token
    const decoded = await promisify(jwt.verify)(
      refreshToken, 
      config.jwtRefreshSecret
    );
    
    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({ 
        success: false, 
        message: 'The user belonging to this token no longer exists.' 
      });
    }
    
    // Generate new access token
    const token = jwt.sign(
      { id: currentUser._id }, 
      config.jwtSecret, 
      { expiresIn: config.jwtExpiresIn }
    );
    
    // Set cookie with new token
    res.cookie('jwt', token, {
      expires: new Date(
        Date.now() + parseInt(config.jwtExpiresIn) * 1000
      ),
      httpOnly: true,
      secure: config.isProduction
    });
    
    // Add user to request
    req.user = currentUser;
    next();
  } catch (error) {
    logger.error(`Token refresh error: ${error.message}`);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid refresh token' 
    });
  }
}; 