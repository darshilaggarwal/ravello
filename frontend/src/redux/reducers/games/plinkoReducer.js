import {
  PLINKO_DROP_BALL_REQUEST,
  PLINKO_DROP_BALL_SUCCESS,
  PLINKO_DROP_BALL_FAILURE,
  PLINKO_BALL_UPDATE,
  PLINKO_BALL_LANDED,
  PLINKO_RESET_GAME,
  PLINKO_SET_RISK,
  PLINKO_CLEAR_HISTORY,
  LOGOUT
} from '../../actions/types';
import { GAMES } from '../../../config/constants';

// Load existing history from localStorage
const loadSavedHistory = () => {
  try {
    const savedHistory = localStorage.getItem('plinkoHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  } catch (error) {
    console.error('Error loading plinko history:', error);
    return [];
  }
};

const initialState = {
  loading: false,
  error: null,
  activeBalls: [],
  currentRisk: GAMES.PLINKO.DEFAULT_RISK,
  multipliers: GAMES.PLINKO.MULTIPLIERS[GAMES.PLINKO.DEFAULT_RISK],
  history: loadSavedHistory()
};

const plinkoReducer = (state = initialState, action) => {
  switch (action.type) {
    case PLINKO_DROP_BALL_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };
      
    case PLINKO_DROP_BALL_SUCCESS:
      return {
        ...state,
        loading: false,
        activeBalls: [...state.activeBalls, action.payload]
      };
      
    case PLINKO_DROP_BALL_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
      
    case PLINKO_BALL_UPDATE:
      return {
        ...state,
        activeBalls: state.activeBalls.map(ball => 
          ball.id === action.payload.id ? action.payload : ball
        )
      };
      
    case PLINKO_BALL_LANDED:
      return {
        ...state,
        activeBalls: state.activeBalls.filter(ball => ball.id !== action.payload.id),
        history: [
          {
            id: action.payload.id,
            betAmount: action.payload.betAmount,
            winAmount: action.payload.winAmount,
            finalMultiplier: action.payload.finalMultiplier,
            timestamp: Date.now(),
            risk: action.payload.risk || state.currentRisk,
            isWin: action.payload.winAmount > action.payload.betAmount
          },
          ...state.history
        ].slice(0, 50), // Keep the last 50 games
      };
      
    case PLINKO_RESET_GAME:
      return {
        ...initialState,
        // Preserve history when resetting the game
        history: state.history
      };
      
    case PLINKO_SET_RISK:
      return {
        ...state,
        currentRisk: action.payload,
        multipliers: GAMES.PLINKO.MULTIPLIERS[action.payload]
      };
      
    case PLINKO_CLEAR_HISTORY:
      // Clear history when explicitly requested
      localStorage.removeItem('plinkoHistory');
      return {
        ...state,
        history: []
      };
      
    case LOGOUT:
      // Clear history when user logs out
      return {
        ...initialState,
        history: []
      };
      
    default:
      return state;
  }
};

export default plinkoReducer; 