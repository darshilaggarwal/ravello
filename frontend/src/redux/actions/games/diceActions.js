import {
  DICE_PLAY_REQUEST,
  DICE_PLAY_SUCCESS,
  DICE_PLAY_FAILURE,
  DICE_RESET_RESULT
} from '../types';
import { updateBalance } from '../userActions';
import api from '../../../utils/api';

// Helper function to save game history to localStorage
const saveGameHistory = (historyEntry) => {
  try {
    const savedHistory = JSON.parse(localStorage.getItem('diceHistory') || '[]');
    const updatedHistory = [historyEntry, ...savedHistory].slice(0, 200); // Keep up to 200 entries
    localStorage.setItem('diceHistory', JSON.stringify(updatedHistory));
    return updatedHistory;
  } catch (error) {
    console.error('Error saving dice history:', error);
    return [];
  }
};

// Play dice game
export const playDice = (betAmount, chance, isOver) => async (dispatch, getState) => {
  dispatch({ type: DICE_PLAY_REQUEST });
  
  try {
    // Generate a roll between 0 and 100
    const roll = Math.random() * 100;
    
    // Check if it's a win
    const target = chance;
    const win = isOver ? roll > target : roll < target;
    
    // Calculate payout
    const winProbability = isOver ? (100 - chance) / 100 : chance / 100;
    const houseFee = 0.01; // 1% house edge
    const multiplier = (1 / winProbability) * (1 - houseFee);
    const payout = win ? betAmount * multiplier : 0;
    
    // Update balance
    const { user } = getState();
    const currentBalance = user.profile?.balance || 0;
    let newBalance;
    
    if (win) {
      newBalance = currentBalance + payout - betAmount;
    } else {
      newBalance = currentBalance - betAmount;
    }
    
    // Ensure balance doesn't go below 0
    newBalance = Math.max(0, newBalance);
    
    dispatch(updateBalance(newBalance));
    
    // Format result with additional fields
    const result = {
      betAmount,
      roll: parseFloat(roll.toFixed(2)),
      target,
      win,
      payout,
      rollType: isOver ? 'over' : 'under',
      isWin: win,
      timestamp: Date.now()
    };
    
    // Save to localStorage for persistence
    const updatedHistory = saveGameHistory(result);
    
    dispatch({
      type: DICE_PLAY_SUCCESS,
      payload: result
    });
    
    return result;
  } catch (error) {
    dispatch({
      type: DICE_PLAY_FAILURE,
      payload: error.message
    });
    throw error;
  }
};

// Reset dice result
export const resetDiceResult = () => ({
  type: DICE_RESET_RESULT
}); 