const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { redisClient } = require('./config/redis');
const config = require('./config/config');
const logger = require('./utils/logger');
const { generateServerSeed, generateClientSeed, generateGameHash } = require('./utils/fairness');

// Constants for the crash game
const GAME_STATE_KEY = 'crash:current';
const PLAYERS_KEY = 'crash:players';
const HISTORY_KEY = 'crash:history';
const BETTING_PHASE_DURATION = 10000; // 10 seconds
const TICK_INTERVAL = 100; // 100ms per tick

// In-memory storage for development without Redis
const inMemoryStore = {
  gameState: null,
  players: new Map(),
  history: []
};

// Helper function to check if Redis is available
const isRedisAvailable = () => {
  return redisClient && redisClient.isReady;
};

// Helper functions for storage (Redis or in-memory)
const storeGameState = async (gameData) => {
  if (isRedisAvailable()) {
    await redisClient.set(GAME_STATE_KEY, JSON.stringify(gameData));
  } else {
    inMemoryStore.gameState = gameData;
  }
};

const getGameState = async () => {
  if (isRedisAvailable()) {
    const gameState = await redisClient.get(GAME_STATE_KEY);
    return gameState ? JSON.parse(gameState) : null;
  }
  return inMemoryStore.gameState;
};

const clearPlayers = async () => {
  if (isRedisAvailable()) {
    await redisClient.del(PLAYERS_KEY);
  } else {
    inMemoryStore.players.clear();
  }
};

const storePlayers = async (userId, playerData) => {
  if (isRedisAvailable()) {
    await redisClient.hSet(PLAYERS_KEY, userId, JSON.stringify(playerData));
  } else {
    inMemoryStore.players.set(userId, playerData);
  }
};

const getPlayers = async () => {
  if (isRedisAvailable()) {
    const playerData = await redisClient.hGetAll(PLAYERS_KEY);
    return playerData || {};
  }
  
  // Convert Map to object similar to Redis hGetAll
  const players = {};
  inMemoryStore.players.forEach((value, key) => {
    players[key] = JSON.stringify(value);
  });
  return players;
};

const storeHistory = async (historyItem) => {
  if (isRedisAvailable()) {
    await redisClient.lPush(HISTORY_KEY, JSON.stringify(historyItem));
    await redisClient.lTrim(HISTORY_KEY, 0, 49); // Keep only last 50 games
  } else {
    inMemoryStore.history.unshift(historyItem);
    if (inMemoryStore.history.length > 50) {
      inMemoryStore.history = inMemoryStore.history.slice(0, 50);
    }
  }
};

const getHistory = async (limit = 50) => {
  if (isRedisAvailable()) {
    const history = await redisClient.lRange(HISTORY_KEY, 0, limit - 1);
    return history ? history.map(item => JSON.parse(item)) : [];
  }
  return inMemoryStore.history.slice(0, limit);
};

// Crash game timer variables
let crashGameInterval = null;
let crashGameTimeout = null;

// Function to initialize crash game
const initCrashGame = async (io) => {
  try {
    // Clear any existing game intervals/timeouts
    if (crashGameInterval) clearInterval(crashGameInterval);
    if (crashGameTimeout) clearTimeout(crashGameTimeout);
    
    // Generate game data
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const nonce = Date.now();
    
    // Generate game hash and crash point
    const hash = generateGameHash(serverSeed, clientSeed, nonce);
    
    // Calculate crash point (implementation in crashController)
    const crashPoint = generateCrashPoint(hash);
    
    const gameData = {
      gameId: Date.now().toString(),
      status: 'betting',
      serverSeed,
      clientSeed,
      nonce,
      hash,
      crashPoint,
      startTime: Date.now(),
      bettingPhaseEnd: Date.now() + BETTING_PHASE_DURATION,
      currentMultiplier: 1.00
    };
    
    // Store game data
    await storeGameState(gameData);
    
    // Clear any existing players
    await clearPlayers();
    
    // Emit game state to clients
    io.to('crash').emit('game_status', {
      status: 'betting',
      bettingPhaseEnd: gameData.bettingPhaseEnd,
      startTime: gameData.startTime
    });
    
    // Start game after betting phase
    crashGameTimeout = setTimeout(() => {
      startCrashGame(io);
    }, BETTING_PHASE_DURATION);
    
    logger.info(`New crash game initialized - Crash point: ${crashPoint}`);
    
  } catch (error) {
    logger.error(`Error initializing crash game: ${error.message}`);
    
    // Attempt to recover by trying again after a delay
    setTimeout(() => initCrashGame(io), 5000);
  }
};

// Function to start the crash game (after betting phase)
const startCrashGame = async (io) => {
  try {
    // Get current game state
    const gameData = await getGameState();
    if (!gameData) {
      logger.error('No game state found when starting crash game');
      return initCrashGame(io);
    }
    
    // Update game status to in_progress
    gameData.status = 'in_progress';
    gameData.startTime = Date.now();
    await storeGameState(gameData);
    
    // Emit game start event
    io.to('crash').emit('game_start');
    
    let elapsed = 0;
    let currentMultiplier = 1.00;
    
    // Start the game tick interval
    crashGameInterval = setInterval(async () => {
      try {
        elapsed += TICK_INTERVAL;
        
        // Calculate current multiplier
        // Use a formula that grows slower over time: (elapsed_time_in_seconds + 1)^0.7
        currentMultiplier = Math.pow((elapsed / 1000) + 1, 0.7);
        currentMultiplier = parseFloat(currentMultiplier.toFixed(2));
        
        // Update game data
        gameData.currentMultiplier = currentMultiplier;
        await storeGameState(gameData);
        
        // Send multiplier update to clients
        io.to('crash').emit('multiplier_update', {
          multiplier: currentMultiplier,
          elapsed
        });
        
        // Process auto-cashouts
        const playerData = await getPlayers();
        
        if (playerData && Object.keys(playerData).length > 0) {
          for (const [userId, playerJson] of Object.entries(playerData)) {
            const player = JSON.parse(playerJson);
            
            // Check if player has auto-withdraw set and is still active
            if (player.status === 'active' && player.autoWithdraw && player.autoWithdraw <= currentMultiplier) {
              await processAutoCashout(io, userId, player, currentMultiplier);
            }
          }
        }
        
        // Check if we've reached the crash point
        if (currentMultiplier >= gameData.crashPoint) {
          await endCrashGame(io, gameData);
        }
        
      } catch (error) {
        logger.error(`Error in crash game tick: ${error.message}`);
      }
    }, TICK_INTERVAL);
    
  } catch (error) {
    logger.error(`Error starting crash game: ${error.message}`);
    // Attempt to recover
    clearInterval(crashGameInterval);
    initCrashGame(io);
  }
};

// Function to process auto-cashouts
const processAutoCashout = async (io, userId, player, currentMultiplier) => {
  try {
    // Mark player as cashed out
    player.status = 'cashed_out';
    player.cashedOutAt = currentMultiplier;
    player.winAmount = Math.floor(player.betAmount * currentMultiplier);
    
    // Update player data
    await storePlayers(userId, player);
    
    // Update user balance (in a separate function/service)
    // This is a simplified version - in production, use transactions
    const user = await User.findById(userId);
    if (user) {
      user.balance += player.winAmount;
      await user.save();
    }
    
    // Emit cashout event
    io.to('crash').emit('player_cashout', {
      userId,
      username: player.username,
      multiplier: currentMultiplier,
      winAmount: player.winAmount,
      isAuto: true
    });
    
  } catch (error) {
    logger.error(`Error processing auto-cashout: ${error.message}`);
  }
};

// Function to end the crash game
const endCrashGame = async (io, gameData) => {
  try {
    // Clear interval
    clearInterval(crashGameInterval);
    
    // Update game status to crashed
    gameData.status = 'crashed';
    gameData.endTime = Date.now();
    await storeGameState(gameData);
    
    // Get all players who didn't cash out
    const playerData = await getPlayers();
    const losers = [];
    
    // Process losers (players who didn't cash out)
    if (playerData && Object.keys(playerData).length > 0) {
      for (const [userId, playerJson] of Object.entries(playerData)) {
        const player = JSON.parse(playerJson);
        
        if (player.status === 'active') {
          player.status = 'busted';
          await storePlayers(userId, player);
          
          losers.push({
            userId,
            username: player.username,
            betAmount: player.betAmount
          });
        }
      }
    }
    
    // Emit crash event
    io.to('crash').emit('game_crash', {
      crashPoint: gameData.crashPoint,
      losers
    });
    
    // Store game in history
    await storeHistory({
      gameId: gameData.gameId,
      crashPoint: gameData.crashPoint,
      serverSeed: gameData.serverSeed,
      clientSeed: gameData.clientSeed,
      hash: gameData.hash,
      nonce: gameData.nonce,
      timestamp: gameData.endTime
    });
    
    // Start a new game after a delay
    setTimeout(() => {
      initCrashGame(io);
    }, 5000); // 5 second delay between games
    
  } catch (error) {
    logger.error(`Error ending crash game: ${error.message}`);
    // Try to recover
    setTimeout(() => {
      initCrashGame(io);
    }, 5000);
  }
};

// Generate crash point from hash
const generateCrashPoint = (hash) => {
  // Convert first 13 characters of hash to a number
  const hexString = hash.slice(0, 13);
  const decimalValue = parseInt(hexString, 16);
  
  // Calculate crash point with house edge (5%)
  // Formula: (100 - house_edge) / (r % 100)
  // where r is a number between 0-99
  const r = decimalValue % 100;
  if (r === 0) return 100.00; // Max crash point (rare)
  
  let crashPoint = (100 - 5) / r;
  crashPoint = Math.max(1.01, crashPoint); // Minimum crash point
  crashPoint = Math.min(100.00, crashPoint); // Maximum crash point
  
  return parseFloat(crashPoint.toFixed(2));
};

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    
    // Attach user to socket
    socket.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role
    };
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    next(new Error('Authentication error: Invalid token'));
  }
};

// Main socket.io handler
module.exports = function(io) {
  // Use authentication middleware
  io.use(authenticateSocket);
  
  // Initialize crash game when server starts
  initCrashGame(io);
  
  io.on('connection', async (socket) => {
    logger.info(`User connected: ${socket.user.username} (${socket.id})`);
    
    // Handle room joins
    socket.on('join', ({ game }) => {
      if (game === 'crash') {
        socket.join('crash');
        logger.info(`${socket.user.username} joined crash game room`);
        
        // Send current game state to new player
        sendCrashGameState(socket);
      }
    });
    
    // Handle room leaves
    socket.on('leave', ({ game }) => {
      if (game === 'crash') {
        socket.leave('crash');
        logger.info(`${socket.user.username} left crash game room`);
      }
    });
    
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.user.username} (${socket.id})`);
    });
  });
  
  // Function to send current crash game state to a user
  const sendCrashGameState = async (socket) => {
    try {
      const gameData = await getGameState();
      const playerData = await getPlayers();
      
      if (!gameData) {
        return;
      }
      
      // Send game initialization data
      socket.emit('crash:init', {
        gameId: gameData.gameId,
        status: gameData.status,
        currentMultiplier: gameData.currentMultiplier,
        bettingPhaseEnd: gameData.bettingPhaseEnd,
        startTime: gameData.startTime,
        players: playerData ? Object.entries(playerData).map(([userId, playerJson]) => {
          const player = JSON.parse(playerJson);
          return {
            userId,
            username: player.username,
            betAmount: player.betAmount,
            status: player.status,
            cashedOutAt: player.cashedOutAt || null
          };
        }) : []
      });
      
    } catch (error) {
      logger.error(`Error sending crash game state: ${error.message}`);
    }
  };
}; 