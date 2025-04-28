import {
  DICE_PLAY_REQUEST,
  DICE_PLAY_SUCCESS,
  DICE_PLAY_FAILURE,
  DICE_RESET_RESULT,
  DICE_RESET_GAME
} from '../../actions/types';

// Load existing history from localStorage
const loadSavedHistory = () => {
  try {
    const savedHistory = localStorage.getItem('diceHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  } catch (error) {
    console.error('Error loading dice history:', error);
    return [];
  }
};

const initialState = {
  loading: false,
  error: null,
  lastResult: null,
  history: loadSavedHistory()
};

const diceReducer = (state = initialState, action) => {
  switch (action.type) {
    case DICE_PLAY_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };
      
    case DICE_PLAY_SUCCESS:
      return {
        ...state,
        loading: false,
        lastResult: action.payload,
        // Add new roll to history with standardized format
        history: [
          {
            id: `dice-${Date.now()}`,
            betAmount: action.payload.betAmount,
            winAmount: action.payload.win ? action.payload.payout : 0,
            timestamp: Date.now(),
            roll: action.payload.roll,
            target: action.payload.target,
            rollType: action.payload.rollType, // 'over' or 'under'
            isWin: action.payload.win
          },
          ...state.history
        ].slice(0, 50) // Keep the last 50 rolls
      };
      
    case DICE_PLAY_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
      
    case DICE_RESET_RESULT:
      return {
        ...state,
        lastResult: null
      };
      
    case DICE_RESET_GAME:
      return {
        ...initialState,
        // Preserve history when resetting the game
        history: state.history
      };
      
    default:
      return state;
  }
};

export default diceReducer; 