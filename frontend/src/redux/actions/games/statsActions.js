import {
  DICE_CLEAR_HISTORY,
  CRASH_CLEAR_HISTORY,
  MINES_CLEAR_HISTORY,
  PLINKO_CLEAR_HISTORY,
  ADD_TO_COMBINED_HISTORY,
  CLEAR_COMBINED_HISTORY,
  LOAD_COMBINED_HISTORY
} from '../types';

/**
 * Clear game history for a specific game
 * @param {string} gameType - The type of game ('dice', 'crash', 'mines', 'plinko')
 * @returns {Function} - Redux thunk function
 */
export const clearGameHistory = (gameType) => (dispatch) => {
  try {
    // Clear from localStorage first
    const storageKey = `${gameType}History`;
    localStorage.removeItem(storageKey);
    
    // Now dispatch the correct action based on game type
    switch (gameType) {
      case 'dice':
        dispatch({ type: DICE_CLEAR_HISTORY });
        break;
      case 'crash':
        dispatch({ type: CRASH_CLEAR_HISTORY });
        break;
      case 'mines':
        dispatch({ type: MINES_CLEAR_HISTORY });
        break;
      case 'plinko':
        dispatch({ type: PLINKO_CLEAR_HISTORY });
        break;
      default:
        console.error(`Unknown game type: ${gameType}`);
    }
    
    return { success: true, message: `${gameType} history cleared` };
  } catch (error) {
    console.error(`Error clearing ${gameType} history:`, error);
    return { success: false, message: `Error clearing history: ${error.message}` };
  }
};

/**
 * Add a game result to the combined history
 * @param {Object} gameResult - The game result to add
 * @param {string} gameType - The type of game ('dice', 'crash', 'mines', 'plinko')
 * @returns {Object} - Redux action
 */
export const addToCombinedHistory = (gameResult, gameType) => (dispatch) => {
  try {
    // Add game type to the result
    const enrichedResult = {
      ...gameResult,
      gameType,
      timestamp: Date.now()
    };
    
    dispatch({
      type: ADD_TO_COMBINED_HISTORY,
      payload: enrichedResult
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error adding to combined history:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Clear the combined history
 * @returns {Object} - Redux action
 */
export const clearCombinedHistory = () => ({
  type: CLEAR_COMBINED_HISTORY
});

/**
 * Load combined history from storage
 * @returns {Object} - Redux action
 */
export const loadCombinedHistory = () => ({
  type: LOAD_COMBINED_HISTORY
}); 