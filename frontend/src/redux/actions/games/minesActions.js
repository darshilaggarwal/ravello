import {
  MINES_START_GAME_REQUEST,
  MINES_START_GAME_SUCCESS,
  MINES_START_GAME_FAILURE,
  MINES_REVEAL_TILE_REQUEST,
  MINES_REVEAL_TILE_SUCCESS,
  MINES_REVEAL_TILE_FAILURE,
  MINES_CASHOUT_REQUEST,
  MINES_CASHOUT_SUCCESS,
  MINES_CASHOUT_FAILURE,
  MINES_RESET_GAME
} from '../types';
import { updateBalance } from '../userActions';
import api from '../../../utils/api';
import { GAMES } from '../../../config/constants';

// Mock game state for development
let mockGameState = {
  gameId: null,
  betAmount: 0,
  mineCount: 0,
  revealedTiles: [],
  minePositions: [],
  currentMultiplier: 1,
  maxMultiplier: 1,
  gameOver: false,
  win: false,
  balance: 10000
};

// Helper function to create a new game
const createMockGame = (betAmount, mineCount, currentBalance) => {
  // Reset game state
  mockGameState = {
    gameId: Date.now().toString(),
    betAmount,
    mineCount,
    revealedTiles: [],
    minePositions: [],
    currentMultiplier: 1,
    maxMultiplier: calculateMaxMultiplier(mineCount),
    gameOver: false,
    win: false,
    balance: currentBalance
  };

  // Generate random mine positions
  const totalTiles = 25; // 5x5 grid
  const positions = [];
  while (positions.length < mineCount) {
    const position = Math.floor(Math.random() * totalTiles);
    if (!positions.includes(position)) {
      positions.push(position);
    }
  }
  mockGameState.minePositions = positions;

  // Subtract bet amount from balance
  mockGameState.balance -= betAmount;
  
  // Store mock data
  localStorage.setItem('mockUserData', JSON.stringify({
    balance: mockGameState.balance
  }));

  return mockGameState;
};

// Helper function to calculate multiplier based on tiles revealed
const calculateMultiplier = (revealedCount, mineCount) => {
  if (revealedCount === 0) return 1;
  
  const totalTiles = 25;
  const safeTiles = totalTiles - mineCount;
  
  // Formula to calculate multiplier
  // This is a simplified version, real games use more complex formulas
  let multiplier = 1;
  for (let i = 0; i < revealedCount; i++) {
    multiplier *= (safeTiles - i) / (safeTiles - i - 1);
  }
  
  // Apply house edge
  const houseEdge = 0.01; // 1% house edge
  multiplier *= (1 - houseEdge);
  
  return parseFloat(multiplier.toFixed(2));
};

// Helper function to calculate max possible multiplier
const calculateMaxMultiplier = (mineCount) => {
  const totalTiles = 25;
  const safeTiles = totalTiles - mineCount;
  
  // Calculate max multiplier if all safe tiles are revealed
  return calculateMultiplier(safeTiles - 1, mineCount);
};

// Helper function to save game history to localStorage
const saveGameHistory = (historyEntry) => {
  try {
    const savedHistory = JSON.parse(localStorage.getItem('minesHistory') || '[]');
    const updatedHistory = [historyEntry, ...savedHistory].slice(0, 200); // Keep more history (200 entries)
    localStorage.setItem('minesHistory', JSON.stringify(updatedHistory));
    return updatedHistory;
  } catch (error) {
    console.error('Error saving mines history:', error);
    return [];
  }
};

// Start a new mines game
export const startMinesGame = (betAmount, mineCount) => async (dispatch, getState) => {
  try {
    dispatch({ type: MINES_START_GAME_REQUEST });
    
    // Get current balance from Redux store
    const { user } = getState();
    const currentBalance = user.profile?.balance || 10000;
    
    // For development, implement a mock response
    // In production, you would use the actual API
    // const res = await api.post('/api/games/mines/start', {
    //   betAmount,
    //   mineCount
    // });
    
    // Create mock game
    const mockGame = createMockGame(betAmount, mineCount, currentBalance);
    
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock response
    const mockResponse = {
      success: true,
      data: {
        game: {
          _id: mockGame.gameId,
          betAmount,
          mineCount,
          status: 'active'
        },
        user: {
          balance: mockGame.balance
        },
        minePositions: mockGame.minePositions
      }
    };

    dispatch({
      type: MINES_START_GAME_SUCCESS,
      payload: mockResponse.data
    });

    // Update user balance
    dispatch(updateBalance(mockGame.balance));

    return mockResponse;
  } catch (error) {
    dispatch({
      type: MINES_START_GAME_FAILURE,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
    });
    throw error;
  }
};

// Reveal a tile in the mines game
export const revealTile = (position) => async (dispatch, getState) => {
  dispatch({ type: MINES_REVEAL_TILE_REQUEST });
  
  try {
    const { mines } = getState().games;
    const { activeGame, minePositions } = mines;
    
    if (!activeGame) {
      throw new Error('No active game found');
    }
    
    // Check if minePositions exists before using includes
    // This fixes "Cannot read properties of null (reading 'includes')" error
    if (!minePositions || !Array.isArray(minePositions)) {
      throw new Error('Game is not properly initialized - mine positions not available');
    }
    
    // Check if the position contains a mine
    const isMine = minePositions.includes(position);
    
    if (isMine) {
      // Create history entry for lost game
      const historyEntry = {
        id: activeGame.id || `mines-${Date.now()}`,
        betAmount: activeGame.betAmount,
        winAmount: 0,
        revealCount: mines.revealedTiles.length,
        mineCount: activeGame.mineCount,
        timestamp: Date.now(),
        isWin: false
      };
      
      // Save to localStorage for persistence
      const updatedHistory = saveGameHistory(historyEntry);
      
      dispatch({
        type: MINES_REVEAL_TILE_FAILURE,
        payload: {
          error: 'You hit a mine!',
          minePositions
        }
      });
      return { isMine, minePositions };
    }
    
    // For successful tile reveals, just dispatch the action
    dispatch({
      type: MINES_REVEAL_TILE_SUCCESS,
      payload: { position }
    });
    
    return { isMine: false, position };
  } catch (error) {
    dispatch({
      type: MINES_REVEAL_TILE_FAILURE,
      payload: {
        error: error.message,
        minePositions: []
      }
    });
    throw error;
  }
};

// Cashout from mines game
export const cashoutMines = () => async (dispatch, getState) => {
  dispatch({ type: MINES_CASHOUT_REQUEST });
  
  try {
    const { mines } = getState().games;
    const { activeGame, revealedTiles } = mines;
    
    if (!activeGame) {
      throw new Error('No active game found');
    }
    
    // Calculate the win amount (based on multiplier)
    const totalTiles = GAMES.MINES.GRID_SIZE;
    const safeTiles = totalTiles - activeGame.mineCount;
    const safeRevealedCount = revealedTiles.length;
    
    // Calculate multiplier
    let multiplier = 1;
    for (let i = 0; i < safeRevealedCount; i++) {
      multiplier *= (totalTiles - i) / (safeTiles - i);
    }
    
    // Apply house edge
    multiplier *= 0.97;
    
    // Calculate final win amount
    const winAmount = activeGame.betAmount * multiplier;
    
    // Update user balance
    const { user } = getState();
    const currentBalance = user.profile?.balance || 0;
    const newBalance = currentBalance + winAmount;
    
    dispatch(updateBalance(newBalance));
    
    // Save to localStorage in dev mode
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('mockUserData', JSON.stringify({
        balance: newBalance
      }));
    }
    
    // Create history entry
    const historyEntry = {
      id: activeGame.id || `mines-${Date.now()}`,
      betAmount: activeGame.betAmount,
      winAmount: winAmount,
      revealCount: revealedTiles.length,
      mineCount: activeGame.mineCount,
      timestamp: Date.now(),
      isWin: true
    };
    
    // Save to localStorage for persistence
    const updatedHistory = saveGameHistory(historyEntry);
    
    dispatch({
      type: MINES_CASHOUT_SUCCESS,
      payload: { winAmount }
    });
    
    return { success: true, winAmount };
  } catch (error) {
    dispatch({
      type: MINES_CASHOUT_FAILURE,
      payload: error.message
    });
    throw error;
  }
};

// Reset mines game
export const resetMinesGame = () => ({
  type: MINES_RESET_GAME
}); 