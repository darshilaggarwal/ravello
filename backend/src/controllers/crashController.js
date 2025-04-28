const User = require('../models/User');
const Game = require('../models/Game');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');
const { redisClient } = require('../config/redis');
const { generateServerSeed, generateClientSeed, generateGameHash, calculateResult } = require('../utils/fairness');
const mongoose = require('mongoose');

// Constants for the game
const HOUSE_EDGE = 0.05; // 5% house edge
const MAX_MULTIPLIER = 100; // Maximum multiplier the game can reach

// Game state keys in Redis
const GAME_STATE_KEY = 'crash:current';
const PLAYERS_KEY = 'crash:players';
const HISTORY_KEY = 'crash:history';

// Helper to generate crash point
const generateCrashPoint = (hash) => {
  // Take first 8 characters of hash (4 bytes)
  const decimal = parseInt(hash.substring(0, 8), 16);
  
  // Divide by max possible value for 4 bytes to get a value between 0-1
  const floatValue = decimal / 0xffffffff;
  
  // Apply house edge
  const houseEdgeMultiplier = 1 / (1 - HOUSE_EDGE);
  
  // Generate crash point using desired distribution
  // Formula is designed to be rare for high multipliers
  let crashPoint;
  
  if (floatValue < 0.01) {
    // 1% chance for crash point between 10 and MAX_MULTIPLIER
    crashPoint = 10 + (floatValue / 0.01) * (MAX_MULTIPLIER - 10);
  } else if (floatValue < 0.1) {
    // 9% chance for crash point between 2 and 10
    crashPoint = 2 + ((floatValue - 0.01) / 0.09) * 8;
  } else {
    // 90% chance for crash point between 1 and 2
    crashPoint = 1 + ((floatValue - 0.1) / 0.9);
  }
  
  // Apply house edge and round to 2 decimal places
  crashPoint = Math.max(1, (crashPoint * (1 - HOUSE_EDGE)));
  return parseFloat(crashPoint.toFixed(2));
};

// @desc    Place a bet for the crash game
// @route   POST /api/games/crash/bet
// @access  Private
exports.placeBet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { betAmount, autoWithdraw } = req.body;
    const userId = req.user.id;
    
    // Get current game state from Redis
    const gameState = await redisClient.get(GAME_STATE_KEY);
    const gameData = gameState ? JSON.parse(gameState) : null;
    
    // Check if game is in betting phase
    if (!gameData || gameData.status !== 'betting') {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Betting is not currently allowed'
      });
    }
    
    // Check if user already has an active bet
    const playersData = await redisClient.hGetAll(PLAYERS_KEY);
    if (playersData && playersData[userId]) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'You already have an active bet'
      });
    }
    
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
    
    // Update user balance
    user.balance -= betAmount;
    await user.save({ session });
    
    // Add player to active players in Redis
    const playerData = {
      userId,
      username: user.username,
      betAmount,
      autoWithdraw: autoWithdraw || null,
      status: 'active'
    };
    
    await redisClient.hSet(PLAYERS_KEY, userId, JSON.stringify(playerData));
    
    // Create transaction record
    await Transaction.create([{
      user: userId,
      amount: betAmount,
      type: 'loss', // Initially marked as loss, will be updated to win if player cashes out
      status: 'completed',
      gameType: 'crash',
      description: 'Crash game bet'
    }], { session });
    
    await session.commitTransaction();
    session.endSession();
    
    // Send data to client and also through socket
    req.app.get('io').to('crash').emit('new_bet', {
      userId,
      username: user.username,
      betAmount,
      autoWithdraw: autoWithdraw || null
    });
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          balance: user.balance
        },
        game: gameData,
        bet: playerData
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    logger.error(`Crash bet error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error placing bet'
    });
  }
};

// @desc    Cashout from the crash game
// @route   POST /api/games/crash/cashout
// @access  Private
exports.cashout = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const userId = req.user.id;
    
    // Get current game state from Redis
    const gameState = await redisClient.get(GAME_STATE_KEY);
    const gameData = gameState ? JSON.parse(gameState) : null;
    
    // Check if game is in progress
    if (!gameData || gameData.status !== 'in_progress') {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Cannot cashout - game is not in progress'
      });
    }
    
    // Check if user has an active bet
    const playerDataStr = await redisClient.hGet(PLAYERS_KEY, userId);
    if (!playerDataStr) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'No active bet found'
      });
    }
    
    const playerData = JSON.parse(playerDataStr);
    
    // Check if player already cashed out
    if (playerData.status !== 'active') {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'You have already cashed out'
      });
    }
    
    // Get current multiplier
    const currentMultiplier = gameData.currentMultiplier;
    
    // Calculate win amount
    const winAmount = Math.floor(playerData.betAmount * currentMultiplier);
    
    // Update player data in Redis
    playerData.status = 'cashed_out';
    playerData.cashedOutAt = currentMultiplier;
    playerData.winAmount = winAmount;
    
    await redisClient.hSet(PLAYERS_KEY, userId, JSON.stringify(playerData));
    
    // Update user balance
    const user = await User.findById(userId).session(session);
    user.balance += winAmount;
    await user.save({ session });
    
    // Create game record
    const game = await Game.create([{
      user: userId,
      gameType: 'crash',
      betAmount: playerData.betAmount,
      outcome: 'win',
      winAmount,
      multiplier: currentMultiplier,
      gameData: {
        crashPoint: gameData.crashPoint,
        cashedOutAt: currentMultiplier,
        gameId: gameData.gameId
      },
      clientSeed: gameData.clientSeed,
      serverSeed: null, // Will be revealed after the game ends
      nonce: gameData.nonce,
      fairnessHash: gameData.hash
    }], { session });
    
    // Create transaction record for the win
    await Transaction.create([{
      user: userId,
      amount: winAmount,
      type: 'win',
      status: 'completed',
      gameId: game[0]._id,
      gameType: 'crash',
      description: `Crash game win - ${currentMultiplier}x`
    }], { session });
    
    await session.commitTransaction();
    session.endSession();
    
    // Send cashout event through socket
    req.app.get('io').to('crash').emit('player_cashout', {
      userId,
      username: user.username,
      multiplier: currentMultiplier,
      winAmount
    });
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          balance: user.balance
        },
        multiplier: currentMultiplier,
        winAmount
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    logger.error(`Crash cashout error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error processing cashout'
    });
  }
};

// @desc    Get current crash game
// @route   GET /api/games/crash/current
// @access  Private
exports.getCurrentGame = async (req, res) => {
  try {
    // Get current game state from Redis
    const gameState = await redisClient.get(GAME_STATE_KEY);
    const gameData = gameState ? JSON.parse(gameState) : null;
    
    // Get all players
    const playersData = await redisClient.hGetAll(PLAYERS_KEY);
    const players = Object.values(playersData || {}).map(p => JSON.parse(p));
    
    res.status(200).json({
      success: true,
      data: {
        game: gameData,
        players
      }
    });
  } catch (error) {
    logger.error(`Get crash game error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving current game'
    });
  }
};

// @desc    Get crash game history
// @route   GET /api/games/crash/history
// @access  Private
exports.getGameHistory = async (req, res) => {
  try {
    // Get history from Redis
    const historyData = await redisClient.lRange(HISTORY_KEY, 0, 49);
    const history = historyData.map(item => JSON.parse(item));
    
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error(`Get crash history error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving game history'
    });
  }
}; 