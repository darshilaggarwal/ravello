const express = require('express');
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

// Register validation rules
const registerValidation = [
  check('username', 'Username is required')
    .not()
    .isEmpty()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters'),
  check('email', 'Please include a valid email')
    .isEmail()
    .normalizeEmail(),
  check('password', 'Password is required')
    .not()
    .isEmpty()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
];

// Login validation rules
const loginValidation = [
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('password', 'Password is required').exists()
];

// Password reset validation
const resetPasswordValidation = [
  check('password', 'Please enter a password with 8 or more characters')
    .isLength({ min: 8 })
];

// Routes
router.post('/register', registerValidation, validateRequest, authController.register);
router.post('/login', loginValidation, validateRequest, authController.login);
router.post('/google', authController.googleAuth);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.put('/reset-password/:token', resetPasswordValidation, validateRequest, authController.resetPassword);
router.get('/logout', authController.logout);
router.get('/me', protect, authController.getMe);

module.exports = router; 