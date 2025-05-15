// API base URL
export const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.revello.com' 
  : 'http://localhost:9000';

// Socket URL
export const SOCKET_URL = process.env.NODE_ENV === 'production'
  ? 'wss://api.revello.com'
  : 'ws://localhost:9000';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 10;

// Game constants
export const GAMES = {
  DICE: {
    MIN_BET: 1,
    MAX_BET: 1000000,
    MIN_MULTIPLIER: 1.01,
    MAX_MULTIPLIER: 100,
    DEFAULT_CHANCE: 50
  },
  CRASH: {
    MIN_BET: 1,
    MAX_BET: 1000000,
    DEFAULT_AUTO_CASHOUT: 2,
  },
  MINES: {
    MIN_BET: 1,
    MAX_BET: 1000000,
    MIN_MINES: 1,
    MAX_MINES: 24,
    DEFAULT_MINES: 5,
    GRID_SIZE: 25
  },
  PLINKO: {
    MIN_BET: 1,
    MAX_BET: 10000,
    ROWS: 16,
    PINS_PER_ROW: 16,
    RISK_LEVELS: ['Low', 'Medium', 'High'],
    DEFAULT_RISK: 'Medium',
    // Multipliers for each risk level and landing position
    // Format: [leftmost slot, ..., rightmost slot]
    MULTIPLIERS: {
      Low: [1.5, 1.2, 1, 0.8, 0.7, 0.5, 0.4, 0.3, 0.3, 0.4, 0.5, 0.7, 0.8, 1, 1.2, 1.5],
      Medium: [5, 2, 1.5, 1, 0.5, 0.3, 0.2, 0.1, 0.1, 0.2, 0.3, 0.5, 1, 1.5, 2, 5],
      High: [10, 5, 3, 1.5, 1, 0.5, 0.2, 0, 0, 0.2, 0.5, 1, 1.5, 3, 5, 10]
    }
  }
};

// Auth constants
export const TOKEN_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days

// Theme constants
export const THEMES = {
  DARK: 'dark',
  LIGHT: 'light'
}; 