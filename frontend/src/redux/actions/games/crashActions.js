import {
  CRASH_GAME_START,
  CRASH_GAME_TICK,
  CRASH_GAME_CRASH,
  CRASH_GAME_WAITING,
  CRASH_PLACE_BET_REQUEST,
  CRASH_PLACE_BET_SUCCESS,
  CRASH_PLACE_BET_FAILURE,
  CRASH_CASHOUT_REQUEST,
  CRASH_CASHOUT_SUCCESS,
  CRASH_CASHOUT_FAILURE,
  CRASH_GET_HISTORY_REQUEST,
  CRASH_GET_HISTORY_SUCCESS,
  CRASH_GET_HISTORY_FAILURE,
  CRASH_RESET_GAME
} from '../../actions/types';
import { updateBalance } from '../../actions/userActions';
import api from '../../../utils/api';
import { addToCombinedHistory } from './statsActions';

// Mock game state for development
const mockGameState = {
  status: 'waiting', // waiting, in_progress, crashed
  startTime: null,
  crashPoint: null,
  currentMultiplier: 0.0,
  crashedAt: null,
  timeElapsed: 0,
  players: [],
  history: [1.5, 2.1, 1.2, 3.2, 1.7]
};

let gameInterval = null;
let waitingTimeout = null;

// Helper to calculate crash point
const calculateCrashPoint = () => {
  // Generate random value between 0 and 1
  const randomValue = Math.random();
  
  // Match the server-side probability distribution:
  // - 50% chance to crash below 1.5x
  // - 30% chance to crash between 1.5x and 2x
  // - 15% chance to crash between 2x and 5x
  // - 4% chance to crash between 5x and 10x
  // - 1% chance to crash above 10x
  
  let crashPoint;
  
  if (randomValue < 0.50) {
    // 50% chance to crash below 1.5x
    crashPoint = 0 + (randomValue / 0.50) * 1.5;
  } else if (randomValue < 0.80) {
    // 30% chance to crash between 1.5x and 2x
    crashPoint = 1.5 + ((randomValue - 0.50) / 0.30) * 0.5;
  } else if (randomValue < 0.95) {
    // 15% chance to crash between 2x and 5x
    crashPoint = 2 + ((randomValue - 0.80) / 0.15) * 3;
  } else if (randomValue < 0.99) {
    // 4% chance to crash between 5x and 10x
    crashPoint = 5 + ((randomValue - 0.95) / 0.04) * 5;
  } else {
    // 1% chance to crash between 10x and 100x
    crashPoint = 10 + ((randomValue - 0.99) / 0.01) * 90;
  }
  
  // Apply house edge (5%)
  crashPoint = crashPoint * (1 - 0.05);
  
  // Make sure crash point is at least 0
  crashPoint = Math.max(0, crashPoint);
  
  return parseFloat(crashPoint.toFixed(2));
};

// Helper to calculate current multiplier based on time elapsed
const calculateMultiplier = (timeElapsed) => {
  // New multiplier growth function that starts from 0
  // (t / 1000)^0.7 - matches server side calculation
  return parseFloat(Math.pow(timeElapsed / 1000, 0.7).toFixed(2));
};

// Helper function to save game history to localStorage
const saveGameHistory = (historyEntry) => {
  try {
    const savedHistory = JSON.parse(localStorage.getItem('crashHistory') || '[]');
    const updatedHistory = [historyEntry, ...savedHistory].slice(0, 200); // Keep up to 200 entries
    localStorage.setItem('crashHistory', JSON.stringify(updatedHistory));
    return updatedHistory;
  } catch (error) {
    console.error('Error saving crash history:', error);
    return [];
  }
};

// Socket Action Creators
// Initialize crash game state from server
export const initCrashState = (data) => ({
  type: CRASH_GAME_START,
  payload: data
});

// Update game status (waiting, in_progress, crashed)
export const updateGameStatus = (data) => ({
  type: data.status === 'waiting' ? CRASH_GAME_WAITING : 
         data.status === 'in_progress' ? CRASH_GAME_START : 
         CRASH_GAME_CRASH,
  payload: data
});

// Start a new game from socket event
export const startGame = (data) => ({
  type: CRASH_GAME_START,
  payload: data
});

// Update multiplier from socket event
export const updateMultiplier = (multiplier) => ({
  type: CRASH_GAME_TICK,
  payload: {
    currentMultiplier: multiplier,
    timeElapsed: Date.now() - (mockGameState.startTime || Date.now())
  }
});

// Game crashed from socket event
export const gameCrash = (data) => (dispatch, getState) => {
  const { crash } = getState().games;
  const myBet = crash.myBet;
  
  // Add the crash point to history
  const crashHistoryEntry = {
    id: `crash-${Date.now()}`,
    crashPoint: data.crashPoint,
    timestamp: Date.now(),
    type: 'crash'
  };
  
  // Save to localStorage for persistence
  saveGameHistory(crashHistoryEntry);

  // Add to combined history
  dispatch(addToCombinedHistory(crashHistoryEntry, 'crash'));
  
  // If player had an active bet and didn't cash out, record it as a loss
  if (myBet && !myBet.cashedOut) {
    const lossHistoryEntry = {
      id: `crash-bet-${Date.now()}`,
      betAmount: myBet.amount,
      winAmount: 0,
      crashPoint: data.crashPoint,
      timestamp: Date.now(),
      isWin: false,
      type: 'crash'
    };
    
    // Add to combined history when a player loses
    dispatch(addToCombinedHistory(lossHistoryEntry, 'crash'));
  }
  
  // Fetch updated history after crash
  dispatch(getCrashHistory());
  
  return dispatch({
    type: CRASH_GAME_CRASH,
    payload: {
      crashPoint: data.crashPoint,
      crashedAt: data.crashedAt
    }
  });
};

// New bet made by a player
export const newBet = (betData) => ({
  type: CRASH_PLACE_BET_SUCCESS,
  payload: { player: betData }
});

// Player cashed out
export const playerCashout = (data) => ({
  type: CRASH_CASHOUT_SUCCESS,
  payload: { player: data }
});

// Start game simulation
export const startCrashGame = () => (dispatch) => {
  try {
    clearInterval(gameInterval);
    clearTimeout(waitingTimeout);

    const crashPoint = calculateCrashPoint();
    console.log("Game starting with crash point:", crashPoint);

    mockGameState.status = 'in_progress';
    mockGameState.startTime = Date.now();
    mockGameState.crashPoint = crashPoint;
    mockGameState.currentMultiplier = 0.0;
    mockGameState.timeElapsed = 0;

    dispatch({
      type: CRASH_GAME_START,
      payload: { ...mockGameState }
    });

    // Start the game ticking
    let startTime = Date.now();
    gameInterval = setInterval(() => {
      const timeElapsed = Date.now() - startTime;
      const currentMultiplier = calculateMultiplier(timeElapsed);

      mockGameState.timeElapsed = timeElapsed;
      mockGameState.currentMultiplier = currentMultiplier;

      dispatch({
        type: CRASH_GAME_TICK,
        payload: {
          timeElapsed,
          currentMultiplier,
        }
      });

      // Check if we reached the crash point
      if (currentMultiplier >= crashPoint) {
        clearInterval(gameInterval);
        mockGameState.status = 'crashed';
        mockGameState.crashedAt = currentMultiplier;
        mockGameState.history = [currentMultiplier, ...mockGameState.history.slice(0, 4)];

        dispatch({
          type: CRASH_GAME_CRASH,
          payload: {
            crashedAt: currentMultiplier,
            crashPoint: crashPoint,
            history: mockGameState.history
          }
        });

        // Wait for 5 seconds before starting a new round
        waitingTimeout = setTimeout(() => {
          mockGameState.status = 'waiting';
          dispatch({
            type: CRASH_GAME_WAITING,
            payload: {}
          });

          // Start a new game after 3 more seconds
          waitingTimeout = setTimeout(() => {
            dispatch(startCrashGame());
          }, 3000);
        }, 5000);
      }
    }, 100); // Update every 100ms
  } catch (error) {
    console.error("Error in crash game simulation:", error);
  }
};

// Place a bet for current game
export const placeBet = (amount, autoCashoutAt = null) => async (dispatch, getState) => {
  dispatch({ type: CRASH_PLACE_BET_REQUEST });
  
  try {
    // Check if game is running
    const { status } = getState().games.crash;
    if (status !== 'in_progress') {
      throw new Error('Game not in progress');
    }
    
    // Create a player object
    const newPlayer = {
      id: `player-${Date.now()}`,
      name: 'You',
      amount,
      autoCashoutAt,
      cashedOut: false,
      timestamp: Date.now()
    };
    
    // Update user balance (subtract bet amount)
    const { user } = getState();
    const currentBalance = user.profile?.balance || 0;
    const newBalance = currentBalance - amount;
    
    if (newBalance < 0) {
      throw new Error('Insufficient balance');
    }
    
    // Update balance in Redux
    dispatch(updateBalance(newBalance));
    
    // Update localStorage in dev mode
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('mockUserData', JSON.stringify({
        balance: newBalance
      }));
    }
    
    dispatch({
      type: CRASH_PLACE_BET_SUCCESS,
      payload: {
        player: newPlayer
      }
    });
    
    return { success: true };
  } catch (error) {
    dispatch({
      type: CRASH_PLACE_BET_FAILURE,
      payload: { error: error.message }
    });
    throw error;
  }
};

// Handle manually cashing out
export const cashOut = (betId) => async (dispatch, getState) => {
  dispatch({ type: CRASH_CASHOUT_REQUEST });
  
  try {
    const { crash } = getState().games;
    const { currentMultiplier } = crash;
    const myBet = crash.myBet;
    
    if (!myBet) {
      throw new Error('No active bet found');
    }
    
    if (myBet.cashedOut) {
      throw new Error('Bet already cashed out');
    }
    
    // Calculate payout
    const payout = myBet.amount * currentMultiplier;
    
    // Update user balance
    const { user } = getState();
    const currentBalance = user.profile?.balance || 0;
    const newBalance = currentBalance + payout;
    
    // Update balance in Redux
    dispatch(updateBalance(newBalance));
    
    // Update localStorage in dev mode
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('mockUserData', JSON.stringify({
        balance: newBalance
      }));
    }
    
    // Create history entry for successful cashout
    const historyEntry = {
      id: `crash-${Date.now()}`,
      betAmount: myBet.amount || 0,
      winAmount: payout,
      crashPoint: currentMultiplier,
      timestamp: Date.now(),
      isWin: true,
      type: 'cashout'
    };
    
    // Save to localStorage for persistence
    const updatedHistory = saveGameHistory(historyEntry);
    
    // Add to combined history when a player wins
    dispatch(addToCombinedHistory(historyEntry, 'crash'));
    
    dispatch({
      type: CRASH_CASHOUT_SUCCESS,
      payload: {
        id: myBet.id,
        multiplier: currentMultiplier,
        payout,
        timestamp: Date.now()
      }
    });
    
    return { success: true };
  } catch (error) {
    dispatch({
      type: CRASH_CASHOUT_FAILURE,
      payload: { error: error.message }
    });
    throw error;
  }
};

// Reset the game state
export const resetCrashGame = () => (dispatch) => {
  clearInterval(gameInterval);
  clearTimeout(waitingTimeout);
  
  dispatch({
    type: CRASH_RESET_GAME
  });
};

// Get crash game history
export const getCrashHistory = () => async (dispatch) => {
  try {
    dispatch({
      type: CRASH_GET_HISTORY_REQUEST
    });

    // Make a real API call to get crash history
    const response = await api.get('/api/games/crash/history');
    
    let history = [];
    if (response.data && response.data.success) {
      // Extract crash points from API response
      history = response.data.data.map(game => game.crashPoint);
    }

    dispatch({
      type: CRASH_GET_HISTORY_SUCCESS,
      payload: { history }
    });

    return Promise.resolve(history);
  } catch (error) {
    dispatch({
      type: CRASH_GET_HISTORY_FAILURE,
      payload: { error: error.message || "Failed to get history" }
    });
    return Promise.reject(error);
  }
}; 