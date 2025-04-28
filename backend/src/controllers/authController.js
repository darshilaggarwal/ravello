const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const config = require('../config/config');
const logger = require('../utils/logger');
const sendEmail = require('../utils/email');

// Helper function to sign JWT token
const signToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
};

// Helper function to sign refresh token
const signRefreshToken = (id) => {
  return jwt.sign({ id }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn
  });
};

// Helper function to create and send tokens
const createSendTokens = (user, statusCode, res) => {
  // Create tokens
  const token = signToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  
  // Set JWT cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + parseInt(config.jwtExpiresIn) * 1000
    ),
    httpOnly: true,
    secure: config.isProduction
  };
  
  // Set refresh token cookie options
  const refreshCookieOptions = {
    expires: new Date(
      Date.now() + parseInt(config.jwtRefreshExpiresIn) * 1000
    ),
    httpOnly: true,
    secure: config.isProduction
  };
  
  // Remove password from output
  user.password = undefined;
  
  // Update last login time
  User.findByIdAndUpdate(user._id, { lastLogin: Date.now() }).catch(err => 
    logger.error(`Error updating last login: ${err.message}`)
  );
  
  // Send cookies and response
  res.cookie('jwt', token, cookieOptions);
  res.cookie('refreshToken', refreshToken, refreshCookieOptions);
  
  // Return a simplified response format that's easier for clients to handle
  res.status(statusCode).json({
    success: true,
    token,
    refreshToken,
    user
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    logger.info(`Registration attempt: Username: ${username}, Email: ${email}`);
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      logger.info(`Registration failed - User exists: ${existingUser.email === email ? 'Email exists' : 'Username exists'}`);
      return res.status(400).json({
        success: false,
        message: 'User with that email or username already exists'
      });
    }
    
    // Create user
    logger.info(`Creating new user: ${username}, ${email}`);
    const user = await User.create({
      username,
      email,
      password
    });
    
    // Generate verification token
    const verificationToken = user.generateVerificationToken();
    await user.save({ validateBeforeSave: false });
    
    // Create verification URL
    const verificationURL = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;
    
    // Create message
    const message = `
      Hello ${user.username},
      
      Thank you for registering at Revello! Please verify your email by clicking the link below:
      
      ${verificationURL}
      
      This link will expire in 24 hours.
      
      If you did not register at Revello, please ignore this email.
    `;
    
    // In development, skip email sending and auto-verify
    if (config.nodeEnv === 'development') {
      logger.info(`Development mode: Auto-verifying user ${username}`);
      user.isVerified = true;
      await user.save({ validateBeforeSave: false });
      
      logger.info(`User registered successfully: ${username}`);
      return res.status(201).json({
        success: true,
        message: 'User registered successfully (dev mode - auto verified)'
      });
    }
    
    // Send email in production
    try {
      logger.info(`Sending verification email to: ${user.email}`);
      await sendEmail({
        email: user.email,
        subject: 'Revello - Email Verification',
        message
      });
      
      // Send response without tokens (user needs to verify email first)
      logger.info(`User registered successfully: ${username}`);
      return res.status(201).json({
        success: true,
        message: 'User registered. Verification email sent.'
      });
    } catch (error) {
      // If email fails, reset verification token and save
      user.verificationToken = undefined;
      user.verificationExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      logger.error(`Email sending error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.'
      });
    }
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error registering user'
    });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    // Get token from params
    const { token } = req.params;
    
    // Hash token
    const verificationToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user with token and check if token has expired
    const user = await User.findOne({
      verificationToken,
      verificationExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }
    
    // Set user as verified and remove verification token
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpire = undefined;
    await user.save();
    
    // Send success response
    return res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    logger.error(`Email verification error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error verifying email'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    logger.info(`Login attempt for email: ${email}`);
    
    // Check if email and password exist
    if (!email || !password) {
      logger.info(`Login failed - Missing email or password`);
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }
    
    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      logger.info(`Login failed - User not found: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if user is verified
    if (!user.isVerified) {
      logger.info(`Login failed - User not verified: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }
    
    // Check if password is correct
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      logger.info(`Login failed - Incorrect password: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    logger.info(`Login successful: ${email}`);
    
    // Send tokens
    createSendTokens(user, 200, res);
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error logging in'
    });
  }
};

// @desc    Google OAuth login/register
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res) => {
  try {
    const { tokenId } = req.body;
    
    const client = new OAuth2Client(config.googleClientId);
    
    // Verify token
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: config.googleClientId
    });
    
    const { email_verified, email, name, picture } = ticket.getPayload();
    
    // Check if email is verified
    if (!email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Google account email is not verified'
      });
    }
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user
      const username = name.replace(/\s/g, '').toLowerCase() + Math.floor(Math.random() * 10000);
      
      user = await User.create({
        username,
        email,
        googleId: ticket.getUserId(),
        profilePicture: picture,
        isVerified: true
      });
    } else {
      // Update user's Google ID and profile picture if not already set
      if (!user.googleId) {
        user.googleId = ticket.getUserId();
        user.profilePicture = picture;
        await user.save();
      }
    }
    
    // Send tokens
    createSendTokens(user, 200, res);
  } catch (error) {
    logger.error(`Google OAuth error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error authenticating with Google'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with that email address'
      });
    }
    
    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });
    
    // Create reset URL
    const resetURL = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
    
    // Create message
    const message = `
      Hello ${user.username},
      
      You requested a password reset for your Revello account. Please use the link below to reset your password:
      
      ${resetURL}
      
      This link will expire in 10 minutes.
      
      If you did not request a password reset, please ignore this email and your password will remain unchanged.
    `;
    
    // Send email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Revello - Password Reset',
        message
      });
      
      return res.status(200).json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch (error) {
      // If email fails, reset token fields and save
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      logger.error(`Password reset email error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.'
      });
    }
  } catch (error) {
    logger.error(`Forgot password error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error processing forgot password request'
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    // Get token from params
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new password'
      });
    }
    
    // Hash token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user with token and check if token has expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    // Set new password and clear reset token fields
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    
    // Send success response
    return res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
};

// @desc    Logout user
// @route   GET /api/auth/logout
// @access  Private
exports.logout = (req, res) => {
  try {
    res.cookie('jwt', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });
    
    res.cookie('refreshToken', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error logging out'
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    logger.info(`Get current user for ID: ${req.user.id}`);
    const user = await User.findById(req.user.id);
    
    if (!user) {
      logger.warn(`User not found for ID: ${req.user.id}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    logger.info(`User profile retrieved successfully: ${user.email}`);
    res.status(200).json(user);
  } catch (error) {
    logger.error(`Get current user error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error getting user profile'
    });
  }
}; 