const User = require('../models/User');
const Game = require('../models/Game');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');
const { redisClient } = require('../config/redis');
const { generateServerSeed, generateClientSeed, generateGameHash } = require('../utils/fairness');
const mongoose = require('mongoose');

// Constants
const TOTAL_TILES = 25; // 5x5 grid

// Game state keys in Redis
const ACTIVE_GAME_PREFIX = 'mines:game:';

// Helper to generate mine positions
const generateMinePositions = (hash, minesCount) => {
  // Create a shuffled array of positions from 0 to 24
  const positions = Array.from({ length: TOTAL_TILES }, (_, i) => i);
  
  // Use the hash to shuffle the positions (Fisher-Yates algorithm)
  for (let i = 0; i < TOTAL_TILES - 1; i++) {
    // Use parts of the hash as the random source
    const j = i + (parseInt(hash.substring(i * 2, i * 2 + 2), 16) % (TOTAL_TILES - i));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  
  // Return the first n positions as mine positions
  return positions.slice(0, minesCount);
};

// Helper to calculate multiplier based on mines and revealed tiles
const calculateMultiplier = (minesCount, revealedCount) => {
  // The formula creates increasing multipliers as more safe tiles are revealed
  // It also adjusts based on the number of mines (more mines = higher multipliers)
  const fairMultiplier = (TOTAL_TILES / (TOTAL_TILES - minesCount)) ** revealedCount;
  
  // Apply a 4% house edge
  const houseEdgeMultiplier = fairMultiplier * 0.96;
  
  // Round to 2 decimal places
  return Math.max(1, parseFloat(houseEdgeMultiplier.toFixed(2)));
};

// @desc    Start a new mines game
// @route   POST /api/games/mines
// @access  Private
exports.startGame = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { betAmount, minesCount } = req.body;
    const userId = req.user.id;
    
    // Check if user already has an active game
    const activeGameKey = `${ACTIVE_GAME_PREFIX}${userId}`;
    const hasActiveGame = await redisClient.exists(activeGameKey);
    
    if (hasActiveGame) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'You already have an active mines game. Cashout or finish it first.'
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
    
    // Generate game data
    const serverSeed = generateServerSeed();
    const clientSeed = req.user.clientSeed || generateClientSeed();
    const nonce = await Game.countDocuments({ user: userId, gameType: 'mines' });
    
    // Generate game hash and mine positions
    const hash = generateGameHash(serverSeed, clientSeed, nonce);
    const minePositions = generateMinePositions(hash, minesCount);
    
    // Create game in Redis
    const gameData = {
      gameId: mongoose.Types.ObjectId().toString(), // Generate a unique ID
      userId,
      betAmount,
      minesCount,
      serverSeed,
      clientSeed,
      nonce,
      hash,
      minePositions,
      revealedPositions: [],
      status: 'active',
      currentMultiplier: 1,
      startedAt: Date.now()
    };
    
    // Store game data in Redis with 1 hour expiry (in case user abandons the game)
    await redisClient.set(activeGameKey, JSON.stringify(gameData), { EX: 3600 });
    
    // Create transaction record for the bet
    await Transaction.create([{
      user: userId,
      amount: betAmount,
      type: 'loss', // Initially marked as loss, will be updated to win if player cashes out
      status: 'completed',
      gameType: 'mines',
      description: 'Mines game bet'
    }], { session });
    
    await session.commitTransaction();
    session.endSession();
    
    // Return game data to client (excluding mine positions)
    const clientGameData = {
      ...gameData,
      minePositions: undefined // Don't send mine positions to client
    };
    
    res.status(200).json({
      success: true,
      data: {
        game: clientGameData,
        user: {
          balance: user.balance
        }
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    logger.error(`Mines game start error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error starting mines game'
    });
  }
};

// @desc    Reveal a tile in the mines game
// @route   POST /api/games/mines/reveal
// @access  Private
exports.revealTile = async (req, res) => {
  try {
    const { position } = req.body;
    const userId = req.user.id;
    
    // Get active game from Redis
    const activeGameKey = `${ACTIVE_GAME_PREFIX}${userId}`;
    const gameDataStr = await redisClient.get(activeGameKey);
    
    if (!gameDataStr) {
      return res.status(404).json({
        success: false,
        message: 'No active mines game found'
      });
    }
    
    const gameData = JSON.parse(gameDataStr);
    
    // Check if game is still active
    if (gameData.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game is no longer active'
      });
    }
    
    // Check if position is valid
    if (position < 0 || position >= TOTAL_TILES) {
      return res.status(400).json({
        success: false,
        message: 'Invalid position'
      });
    }
    
    // Check if position was already revealed
    if (gameData.revealedPositions.includes(position)) {
      return res.status(400).json({
        success: false,
        message: 'This tile was already revealed'
      });
    }
    
    // Check if position contains a mine
    const isMine = gameData.minePositions.includes(position);
    
    // Update game data
    gameData.revealedPositions.push(position);
    
    if (isMine) {
      // Game over - player hit a mine
      gameData.status = 'lost';
      
      // Create game record
      await Game.create({
        user: userId,
        gameType: 'mines',
        betAmount: gameData.betAmount,
        outcome: 'loss',
        winAmount: 0,
        multiplier: 1,
        gameData: {
          minesCount: gameData.minesCount,
          minePositions: gameData.minePositions,
          revealedPositions: gameData.revealedPositions,
          finalMultiplier: 0
        },
        clientSeed: gameData.clientSeed,
        serverSeed: gameData.serverSeed, // Reveal server seed on loss
        nonce: gameData.nonce,
        fairnessHash: gameData.hash
      });
      
      // Remove game from Redis
      await redisClient.del(activeGameKey);
      
      return res.status(200).json({
        success: true,
        data: {
          isMine: true,
          minePositions: gameData.minePositions,
          game: {
            ...gameData,
            currentMultiplier: 0
          }
        }
      });
    } else {
      // Safe tile - calculate new multiplier
      const revealedCount = gameData.revealedPositions.length;
      const safeTilesCount = TOTAL_TILES - gameData.minesCount;
      
      // Calculate new multiplier
      const newMultiplier = calculateMultiplier(gameData.minesCount, revealedCount);
      gameData.currentMultiplier = newMultiplier;
      
      // Check if all safe tiles have been revealed
      if (revealedCount === safeTilesCount) {
        // Auto-cashout if all safe tiles are revealed
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
          // Get user
          const user = await User.findById(userId).session(session);
          
          // Calculate win amount
          const winAmount = Math.floor(gameData.betAmount * newMultiplier);
          
          // Update user balance
          user.balance += winAmount;
          await user.save({ session });
          
          // Create game record
          const game = await Game.create([{
            user: userId,
            gameType: 'mines',
            betAmount: gameData.betAmount,
            outcome: 'win',
            winAmount,
            multiplier: newMultiplier,
            gameData: {
              minesCount: gameData.minesCount,
              minePositions: gameData.minePositions,
              revealedPositions: gameData.revealedPositions,
              finalMultiplier: newMultiplier
            },
            clientSeed: gameData.clientSeed,
            serverSeed: gameData.serverSeed,
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
            gameType: 'mines',
            description: `Mines game win - ${newMultiplier}x`
          }], { session });
          
          await session.commitTransaction();
          session.endSession();
          
          // Update game status
          gameData.status = 'won';
          gameData.winAmount = winAmount;
          
          // Remove game from Redis
          await redisClient.del(activeGameKey);
          
          return res.status(200).json({
            success: true,
            data: {
              isMine: false,
              isCompleted: true,
              minePositions: gameData.minePositions,
              game: gameData,
              multiplier: newMultiplier,
              winAmount,
              user: {
                balance: user.balance
              }
            }
          });
        } catch (error) {
          await session.abortTransaction();
          session.endSession();
          
          logger.error(`Mines auto-cashout error: ${error.message}`);
          throw error; // Let the outer catch handle it
        }
      }
      
      // Update game data in Redis
      await redisClient.set(activeGameKey, JSON.stringify(gameData), { EX: 3600 });
      
      // Return updated game data
      return res.status(200).json({
        success: true,
        data: {
          isMine: false,
          isCompleted: false,
          position,
          multiplier: newMultiplier,
          game: {
            ...gameData,
            minePositions: undefined // Don't send mine positions to client
          }
        }
      });
    }
  } catch (error) {
    logger.error(`Reveal tile error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error revealing tile'
    });
  }
};

// @desc    Cashout from mines game
// @route   POST /api/games/mines/cashout
// @access  Private
exports.cashout = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const userId = req.user.id;
    
    // Get active game from Redis
    const activeGameKey = `${ACTIVE_GAME_PREFIX}${userId}`;
    const gameDataStr = await redisClient.get(activeGameKey);
    
    if (!gameDataStr) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(404).json({
        success: false,
        message: 'No active mines game found'
      });
    }
    
    const gameData = JSON.parse(gameDataStr);
    
    // Check if game is still active
    if (gameData.status !== 'active') {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'Game is no longer active'
      });
    }
    
    // Check if at least one tile has been revealed
    if (gameData.revealedPositions.length === 0) {
      await session.abortTransaction();
      session.endSession();
      
      return res.status(400).json({
        success: false,
        message: 'You need to reveal at least one tile before cashing out'
      });
    }
    
    // Get user
    const user = await User.findById(userId).session(session);
    
    // Calculate win amount
    const winAmount = Math.floor(gameData.betAmount * gameData.currentMultiplier);
    
    // Update user balance
    user.balance += winAmount;
    await user.save({ session });
    
    // Create game record
    const game = await Game.create([{
      user: userId,
      gameType: 'mines',
      betAmount: gameData.betAmount,
      outcome: 'win',
      winAmount,
      multiplier: gameData.currentMultiplier,
      gameData: {
        minesCount: gameData.minesCount,
        minePositions: gameData.minePositions,
        revealedPositions: gameData.revealedPositions,
        finalMultiplier: gameData.currentMultiplier
      },
      clientSeed: gameData.clientSeed,
      serverSeed: null, // Don't reveal server seed on cashout
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
      gameType: 'mines',
      description: `Mines game win - ${gameData.currentMultiplier}x`
    }], { session });
    
    // Update game data
    gameData.status = 'cashed_out';
    gameData.winAmount = winAmount;
    
    await session.commitTransaction();
    session.endSession();
    
    // Remove game from Redis
    await redisClient.del(activeGameKey);
    
    res.status(200).json({
      success: true,
      data: {
        minePositions: gameData.minePositions,
        game: gameData,
        multiplier: gameData.currentMultiplier,
        winAmount,
        user: {
          balance: user.balance
        }
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    logger.error(`Mines cashout error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error processing cashout'
    });
  }
}; 