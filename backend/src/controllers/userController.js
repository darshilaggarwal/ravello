const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Game = require('../models/Game');
const logger = require('../utils/logger');

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving profile'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    
    // Build update object
    const updateFields = {};
    if (username) updateFields.username = username;
    if (email) updateFields.email = email;
    
    // Check if email is being changed and already exists
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
      
      // If email is being changed, set verification status to false
      updateFields.isVerified = false;
      
      // Generate new verification token and send email (implementation not shown)
      // This would be similar to the registration email verification process
    }
    
    // Check if username is being changed and already exists
    if (username && username !== req.user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already in use'
        });
      }
    }
    
    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      data: user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

// @desc    Update password
// @route   PUT /api/users/password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password
    const user = await User.findById(req.user.id).select('+password');
    
    // Check if current password matches
    const isMatch = await user.matchPassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    logger.error(`Update password error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error updating password'
    });
  }
};

// @desc    Get user transactions
// @route   GET /api/users/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort({ date: -1 });
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    logger.error(`Get transactions error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving transactions'
    });
  }
};

// @desc    Get user games
// @route   GET /api/users/games
// @access  Private
exports.getGames = async (req, res) => {
  try {
    const games = await Game.find({ user: req.user.id })
      .sort({ date: -1 });
    
    res.status(200).json({
      success: true,
      count: games.length,
      data: games
    });
  } catch (error) {
    logger.error(`Get games error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving games'
    });
  }
};

// --- ADMIN ROUTES ---

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    logger.error(`Get all users error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving users'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:userId
// @access  Private/Admin
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error(`Get user error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving user'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:userId
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { username, email, role, balance } = req.body;
    
    // Build update object
    const updateFields = {};
    if (username) updateFields.username = username;
    if (email) updateFields.email = email;
    if (role) updateFields.role = role;
    if (balance !== undefined) updateFields.balance = balance;
    
    // Update user
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: updateFields },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });
  } catch (error) {
    logger.error(`Update user error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:userId
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    await user.remove();
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete user error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
}; 