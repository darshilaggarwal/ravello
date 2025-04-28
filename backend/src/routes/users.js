const express = require('express');
const { check } = require('express-validator');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// Update user validation
const updateUserValidation = [
  check('username', 'Username must be between 3 and 20 characters')
    .optional()
    .isLength({ min: 3, max: 20 }),
  check('email', 'Please include a valid email')
    .optional()
    .isEmail()
    .normalizeEmail()
];

// Update password validation
const updatePasswordValidation = [
  check('currentPassword', 'Current password is required').exists(),
  check('newPassword', 'New password must be at least 8 characters')
    .isLength({ min: 8 })
];

// All routes below this middleware require authentication
router.use(protect);

// User routes
router.get('/profile', userController.getProfile);
router.put('/profile', updateUserValidation, validateRequest, userController.updateProfile);
router.put('/password', updatePasswordValidation, validateRequest, userController.updatePassword);
router.get('/transactions', userController.getTransactions);
router.get('/games', userController.getGames);

// Admin routes - restricted to admin users
router.use(restrictTo('admin'));

router.get('/', userController.getAllUsers);
router.get('/:userId', userController.getUser);
router.put('/:userId', updateUserValidation, validateRequest, userController.updateUser);
router.delete('/:userId', userController.deleteUser);

module.exports = router; 