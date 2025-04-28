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
} from '../../actions/types';

// Load existing history from localStorage
const loadSavedHistory = () => {
  try {
    const savedHistory = localStorage.getItem('minesHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  } catch (error) {
    console.error('Error loading mines history:', error);
    return [];
  }
};

const initialState = {
  activeGame: null,
  revealedTiles: [],
  minePositions: [],
  loading: false,
  error: null,
  cashoutLoading: false,
  cashoutError: null,
  revealLoading: false,
  revealError: null,
  gameOver: false,
  winAmount: 0,
  history: loadSavedHistory()
};

const minesReducer = (state = initialState, action) => {
  switch (action.type) {
    case MINES_START_GAME_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };
      
    case MINES_START_GAME_SUCCESS:
      return {
        ...initialState,
        activeGame: action.payload.game,
        loading: false,
        history: state.history,
        minePositions: action.payload.minePositions || []
      };
      
    case MINES_START_GAME_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
      
    case MINES_REVEAL_TILE_REQUEST:
      return {
        ...state,
        revealLoading: true,
        revealError: null
      };
      
    case MINES_REVEAL_TILE_SUCCESS:
      // Handle game over case
      if (action.payload.gameOver) {
        return {
          ...state,
          revealedTiles: [...state.revealedTiles, action.payload.position],
          minePositions: action.payload.isMine ? [...state.revealedTiles, action.payload.position] : action.payload.minePositions,
          gameOver: true,
          winAmount: action.payload.winAmount || 0,
          revealLoading: false
        };
      }
      
      // Handle regular tile reveal
      return {
        ...state,
        revealedTiles: [...state.revealedTiles, action.payload.position],
        revealLoading: false
      };
      
    case MINES_REVEAL_TILE_FAILURE:
      return {
        ...state,
        revealLoading: false,
        revealError: action.payload.error,
        gameOver: true,
        minePositions: action.payload.minePositions,
        winAmount: 0,
        history: [
          {
            id: state.activeGame?.id || `mines-${Date.now()}`,
            betAmount: state.activeGame?.betAmount || 0,
            winAmount: 0,
            revealCount: state.revealedTiles.length,
            mineCount: state.activeGame?.mineCount || 0,
            timestamp: Date.now(),
            isWin: false
          },
          ...state.history
        ].slice(0, 50)
      };
      
    case MINES_CASHOUT_REQUEST:
      return {
        ...state,
        cashoutLoading: true,
        cashoutError: null
      };
      
    case MINES_CASHOUT_SUCCESS:
      return {
        ...state,
        loading: false,
        gameOver: true,
        winAmount: action.payload.winAmount,
        history: [
          {
            id: state.activeGame?.id || `mines-${Date.now()}`,
            betAmount: state.activeGame?.betAmount || 0,
            winAmount: action.payload.winAmount,
            revealCount: state.revealedTiles.length,
            mineCount: state.activeGame?.mineCount || 0,
            timestamp: Date.now(),
            isWin: true
          },
          ...state.history
        ].slice(0, 50)
      };
      
    case MINES_CASHOUT_FAILURE:
      return {
        ...state,
        cashoutLoading: false,
        cashoutError: action.payload
      };
      
    case MINES_RESET_GAME:
      return {
        ...initialState,
        // Preserve history when resetting the game
        history: state.history
      };
      
    default:
      return state;
  }
};

export default minesReducer; 