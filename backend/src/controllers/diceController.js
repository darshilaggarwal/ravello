const User = require('../models/User');
const Game = require('../models/Game');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');
const { generateServerSeed, generateClientSeed, generateGameHash, calculateResult } = require('../utils/fairness');
const mongoose = require('mongoose');

// @desc    Play dice game
// @route   POST /api/games/dice
// @access  Private
exports.playDice = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { betAmount, prediction, direction } = req.body;
    const userId = req.user.id;
    
    // Get user with session to ensure atomic operation
    const user = await User.findById(userId).session(session);
    
    // Check if user has enough balance
    if (user.balance < betAmount) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    // Generate fairness data
    const serverSeed = req.user.serverSeed || generateServerSeed();
    const clientSeed = req.user.clientSeed || generateClientSeed();
    const nonce = await Game.countDocuments({ user: userId, gameType: 'dice' });
    
    // Generate game hash and result
    const hash = generateGameHash(serverSeed, clientSeed, nonce);
    const result = calculateResult(hash, 0, 100); // Result between 0-100
    
    // Determine if user won based on prediction and direction
    let isWin = false;
    if (direction === 'under' && result < prediction) {
      isWin = true;
    } else if (direction === 'over' && result > prediction) {
      isWin = true;
    }
    
    // Calculate multiplier and win amount based on prediction
    // The multiplier is calculated based on the probability of winning
    let multiplier;
    if (direction === 'under') {
      multiplier = (100 / prediction) * 0.97; // 3% house edge
    } else {
      multiplier = (100 / (100 - prediction)) * 0.97; // 3% house edge
    }
    
    // Round multiplier to 2 decimal places
    multiplier = Math.round(multiplier * 100) / 100;
    
    // Calculate win amount
    const winAmount = isWin ? Math.floor(betAmount * multiplier) : 0;
    
    // Update user balance
    const newBalance = isWin 
      ? user.balance - betAmount + winAmount
      : user.balance - betAmount;
    
    user.balance = newBalance;
    await user.save({ session });
    
    // Create game record
    const game = await Game.create([{
      user: userId,
      gameType: 'dice',
      betAmount,
      outcome: isWin ? 'win' : 'loss',
      winAmount,
      multiplier,
      gameData: {
        prediction,
        direction,
        result
      },
      clientSeed,
      serverSeed: isWin ? null : serverSeed, // Only reveal on loss or when user changes seed
      nonce,
      fairnessHash: hash
    }], { session });
    
    // Create transaction record
    await Transaction.create([{
      user: userId,
      amount: isWin ? winAmount : betAmount,
      type: isWin ? 'win' : 'loss',
      status: 'completed',
      gameId: game[0]._id,
      gameType: 'dice',
      description: `Dice game - ${isWin ? 'Win' : 'Loss'}`
    }], { session });
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(200).json({
      success: true,
      data: {
        game: game[0],
        user: {
          balance: newBalance
        },
        result,
        isWin,
        multiplier,
        winAmount
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    logger.error(`Dice game error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error playing dice game'
    });
  }
}; 