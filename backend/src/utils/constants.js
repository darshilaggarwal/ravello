// Game constants
exports.GAMES = {
  DICE: {
    MIN_BET: 1,
    MAX_BET: 10000,
    MIN_MULTIPLIER: 1.01,
    MAX_MULTIPLIER: 100,
    DEFAULT_CHANCE: 50
  },
  CRASH: {
    MIN_BET: 1,
    MAX_BET: 10000,
    DEFAULT_AUTO_CASHOUT: 2,
  },
  MINES: {
    MIN_BET: 1,
    MAX_BET: 10000,
    MIN_MINES: 1,
    MAX_MINES: 24,
    DEFAULT_MINES: 5,
    GRID_SIZE: 25
  },
  PLINKO: {
    MIN_BET: 1,
    MAX_BET: 10000,
    ROWS: 16
  }
};

// Redis keys
exports.REDIS_KEYS = {
  CRASH_GAME_STATE: 'crash:gameState',
  CRASH_PLAYERS: 'crash:players'
};

// Wallet constants
exports.WALLET = {
  DEFAULT_BALANCE: 10000
};

// Authentication constants
exports.AUTH = {
  TOKEN_EXPIRES_IN: '1h',
  REFRESH_TOKEN_EXPIRES_IN: '7d'
}; 