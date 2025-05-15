import {
  PLINKO_DROP_BALL_REQUEST,
  PLINKO_DROP_BALL_SUCCESS,
  PLINKO_DROP_BALL_FAILURE,
  PLINKO_BALL_UPDATE,
  PLINKO_BALL_LANDED,
  PLINKO_RESET_GAME,
  PLINKO_SET_RISK
} from '../types';
import { updateBalance } from '../userActions';
import { GAMES } from '../../../config/constants';
import soundManager from '../../../utils/SoundManager';
import { addToCombinedHistory } from './statsActions';

// Preload Plinko sounds
soundManager.preloadAll({
  'plinkoHit': '/sounds/plinko-hit.mp3',
  'plinkoWin': '/sounds/plinko-win.mp3',
  'plinkoDrop': '/sounds/plinko-drop.mp3'
});

// Utility function to generate a unique ID for balls
const generateBallId = () => Math.random().toString(36).substring(2, 10);

// Utility function to calculate if a pin pushes the ball left or right
// Using a biased random for more realistic physics simulation
const calculateBounce = (row, column) => {
  // Use true randomness instead of seeded value
  const randomValue = Math.random();
  
  // Add slight bias based on position but much less than before
  const centerBias = Math.abs(column - GAMES.PLINKO.PINS_PER_ROW / 2) / (GAMES.PLINKO.PINS_PER_ROW / 2);
  
  // Add small random noise to create more variation in paths
  const noise = (Math.random() * 0.2) - 0.1; // Value between -0.1 and 0.1
  
  // Compute final random value with reduced bias and added noise
  const adjustedRandom = randomValue + (centerBias * 0.1) + noise;
  
  return adjustedRandom > 0.5 ? 1 : 0; // 0 = left, 1 = right
};

// Helper function to save game history to localStorage 
const saveGameHistory = (historyEntry) => {
  try {
    const savedHistory = JSON.parse(localStorage.getItem('plinkoHistory') || '[]');
    const updatedHistory = [historyEntry, ...savedHistory].slice(0, 200); // Keep more history
    localStorage.setItem('plinkoHistory', JSON.stringify(updatedHistory));
    return updatedHistory;
  } catch (error) {
    console.error('Error saving plinko history:', error);
    return [];
  }
};

// Drop a ball and set up the simulation
export const dropBall = (betAmount, riskLevel) => async (dispatch, getState) => {
  try {
    dispatch({ type: PLINKO_DROP_BALL_REQUEST });
    
    // Get current balance from Redux store
    const { user } = getState();
    const currentBalance = user.profile?.balance || 10000;
    
    // Check if enough balance
    if (currentBalance < betAmount) {
      dispatch({
        type: PLINKO_DROP_BALL_FAILURE,
        payload: 'Insufficient balance'
      });
      return;
    }
    
    // Play drop sound
    soundManager.play('plinkoDrop');
    
    // Create a new ball
    const ball = {
      id: generateBallId(),
      betAmount,
      riskLevel,
      row: 0,
      column: Math.floor(GAMES.PLINKO.PINS_PER_ROW / 2), // Start from middle
      path: [], // Will store the path of the ball
      finalMultiplier: null,
      winAmount: 0,
      status: 'dropping'
    };
    
    // Update user balance in Redux (deduct bet amount)
    const newBalance = currentBalance - betAmount;
    dispatch(updateBalance(newBalance));
    
    // Update localStorage for consistency in development mode
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('mockUserData', JSON.stringify({
        balance: newBalance
      }));
    }
    
    // Add the ball to the active balls
    dispatch({
      type: PLINKO_DROP_BALL_SUCCESS,
      payload: ball
    });
    
    // Start the ball simulation
    simulateBallPath(dispatch, ball, getState);
    
    return ball;
  } catch (error) {
    dispatch({
      type: PLINKO_DROP_BALL_FAILURE,
      payload: error.message || 'Failed to drop ball'
    });
    throw error;
  }
};

// Simulate the ball's path through the pins
const simulateBallPath = async (dispatch, ball, getState) => {
  let currentBall = { ...ball };
  
  // Loop through each row
  for (let row = 0; row < GAMES.PLINKO.ROWS; row++) {
    // Dynamic timing for more realistic physics - faster as ball falls
    const animationDelay = 250 - (row * 5); // Starts at 250ms, gradually decreases
    await new Promise(resolve => setTimeout(resolve, animationDelay));
    
    // If we're at the last row, determine landing position
    if (row === GAMES.PLINKO.ROWS - 1) {
      // Calculate final landing position and multiplier
      const { multipliers } = getState().games.plinko;
      const landingPosition = currentBall.column;
      const multiplier = multipliers[landingPosition];
      const winAmount = currentBall.betAmount * multiplier;
      const isWin = multiplier >= 1; // Define a win as getting at least 1x multiplier
      
      // Update status to "landing" for animation transition
      dispatch({
        type: PLINKO_BALL_UPDATE,
        payload: {
          ...currentBall,
          status: 'landing'
        }
      });
      
      // Short delay for landing animation start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      currentBall = {
        ...currentBall,
        row: row + 1,
        finalMultiplier: multiplier,
        winAmount,
        status: 'landed',
        isWin,
        risk: ball.risk // Ensure risk level is included for history
      };
      
      // Update the ball state
      dispatch({
        type: PLINKO_BALL_UPDATE,
        payload: currentBall
      });
      
      // Wait for landing animation
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Play sound based on win amount
      if (winAmount > currentBall.betAmount) {
        soundManager.play('plinkoWin');
      } else {
        soundManager.play('plinkoHit');
      }
      
      // Mark ball as landed and save to history
      const historyEntry = {
        id: currentBall.id,
        betAmount: currentBall.betAmount,
        winAmount: currentBall.winAmount,
        finalMultiplier: currentBall.finalMultiplier,
        timestamp: Date.now(),
        risk: currentBall.risk || getState().currentRisk,
        isWin: currentBall.isWin
      };
      
      // Save to localStorage for persistence
      const updatedHistory = saveGameHistory(historyEntry);
      
      // Mark ball as landed
      dispatch({
        type: PLINKO_BALL_LANDED,
        payload: currentBall
      });
      
      // Update balance if there's a win
      if (winAmount > 0) {
        const { user } = getState();
        const currentBalance = user.profile?.balance || 0;
        
        // Add win amount to balance
        const newBalance = currentBalance + winAmount;
        dispatch(updateBalance(newBalance));
        
        // Update localStorage in dev mode
        if (process.env.NODE_ENV === 'development') {
          localStorage.setItem('mockUserData', JSON.stringify({
            balance: newBalance
          }));
        }
      }
      
      // Add to combined history
      dispatch(addToCombinedHistory({
        id: currentBall.id,
        betAmount: currentBall.betAmount,
        winAmount: currentBall.winAmount,
        finalMultiplier: currentBall.finalMultiplier,
        timestamp: Date.now(),
        risk: currentBall.risk || getState().currentRisk,
        isWin: currentBall.winAmount > currentBall.betAmount
      }, 'plinko'));
      
      break;
    }
    
    // Short random delay for more natural movement
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    
    // Determine if the ball goes left or right
    const direction = calculateBounce(row, currentBall.column);
    
    // Calculate new column position based on the bounce direction
    const newColumn = currentBall.column + (direction === 0 ? -1 : 1);
    
    // Ensure column is within bounds
    const boundedColumn = Math.max(0, Math.min(GAMES.PLINKO.PINS_PER_ROW - 1, newColumn));
    
    // Play pin hit sound
    soundManager.play('plinkoHit');
    
    // Update ball position
    currentBall = {
      ...currentBall,
      row: row + 1,
      column: boundedColumn,
      path: [...currentBall.path, direction]
    };
    
    // Update the ball state
    dispatch({
      type: PLINKO_BALL_UPDATE,
      payload: currentBall
    });
  }
};

// Set the risk level
export const setRiskLevel = (riskLevel) => ({
  type: PLINKO_SET_RISK,
  payload: riskLevel
});

// Reset the game
export const resetPlinkoGame = () => ({
  type: PLINKO_RESET_GAME
}); 