import {
  DICE_PLAY_REQUEST,
  DICE_PLAY_SUCCESS,
  DICE_PLAY_FAILURE,
  DICE_RESET_RESULT
} from '../types';
import { updateBalance } from '../userActions';
import { addToCombinedHistory } from './statsActions';
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
    const direction = isOver ? 'over' : 'under';
    const response = await api.post('/api/games/dice', {
      betAmount,
      prediction: chance,
      direction
    });
    
    const { data } = response.data;
    
    const result = {
      betAmount: data.game.betAmount,
      roll: data.result,
      target: chance,
      win: data.isWin,
      payout: data.winAmount,
      rollType: direction,
      isWin: data.isWin,
      timestamp: Date.now()
    };
    
    // Save to localStorage for history
    saveGameHistory(result);
    
    dispatch({
      type: DICE_PLAY_SUCCESS,
      payload: result
    });
    
    // Add to combined history
    dispatch(addToCombinedHistory(result, 'dice'));
    
    // Update balance in Redux from server response
    dispatch(updateBalance(data.user.balance));
    
    return data;
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