const express = require('express');
const { check } = require('express-validator');
const { protect } = require('../middleware/auth');
const validateRequest = require('../middleware/validateRequest');
const diceController = require('../controllers/diceController');
const crashController = require('../controllers/crashController');
const minesController = require('../controllers/minesController');
const { GAMES } = require('../utils/constants');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Game bet validation
const betValidation = [
  check('betAmount', 'Bet amount is required')
    .isNumeric()
    .withMessage('Bet amount must be a number')
    .isFloat({ min: GAMES.DICE.MIN_BET, max: GAMES.DICE.MAX_BET })
    .withMessage(`Bet amount must be between ${GAMES.DICE.MIN_BET} and ${GAMES.DICE.MAX_BET}`)
];

// Dice game routes
router.post(
  '/dice',
  [
    ...betValidation,
    check('prediction', 'Prediction is required')
      .isNumeric()
      .withMessage('Prediction must be a number')
      .isFloat({ min: 1, max: 100 })
      .withMessage('Prediction must be between 1 and 100'),
    check('direction', 'Direction is required')
      .isIn(['under', 'over'])
      .withMessage('Direction must be either "under" or "over"')
  ],
  validateRequest,
  diceController.playDice
);

// Crash game routes
router.post(
  '/crash/bet',
  [
    ...betValidation,
    check('autoWithdraw', 'Auto withdraw value is required')
      .optional()
      .isNumeric()
      .withMessage('Auto withdraw must be a number')
      .isFloat({ min: 1.01 })
      .withMessage('Auto withdraw must be at least 1.01')
  ],
  validateRequest,
  crashController.placeBet
);

router.post('/crash/cashout', crashController.cashout);
router.get('/crash/current', crashController.getCurrentGame);
router.get('/crash/history', crashController.getGameHistory);

// Mines game routes
router.post(
  '/mines',
  [
    ...betValidation,
    check('minesCount', 'Mines count is required')
      .isNumeric()
      .withMessage('Mines count must be a number')
      .isInt({ min: 1, max: 24 })
      .withMessage('Mines count must be between 1 and 24')
  ],
  validateRequest,
  minesController.startGame
);

router.post(
  '/mines/reveal',
  [
    check('gameId', 'Game ID is required').not().isEmpty(),
    check('position', 'Position is required')
      .isNumeric()
      .withMessage('Position must be a number')
      .isInt({ min: 0, max: 24 })
      .withMessage('Position must be between 0 and 24')
  ],
  validateRequest,
  minesController.revealTile
);

router.post(
  '/mines/cashout',
  [
    check('gameId', 'Game ID is required').not().isEmpty()
  ],
  validateRequest,
  minesController.cashout
);

// Fairness and verification
router.get('/verify/:gameId', require('../controllers/fairnessController').verifyGame);
router.get('/seeds', require('../controllers/fairnessController').getUserSeeds);
router.post('/seeds', require('../controllers/fairnessController').updateClientSeed);

module.exports = router; 