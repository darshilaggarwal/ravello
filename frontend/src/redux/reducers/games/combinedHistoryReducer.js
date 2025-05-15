import {
  ADD_TO_COMBINED_HISTORY,
  CLEAR_COMBINED_HISTORY,
  LOAD_COMBINED_HISTORY,
  LOGOUT
} from '../../actions/types';

// Load existing history from localStorage
const loadSavedHistory = () => {
  try {
    const savedHistory = localStorage.getItem('combinedGameHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  } catch (error) {
    console.error('Error loading combined history:', error);
    return [];
  }
};

const initialState = {
  history: loadSavedHistory(),
  totalWagered: 0,
  totalWon: 0,
  winCount: 0,
  lossCount: 0
};

// Calculate statistics from history
const calculateStats = (history) => {
  if (!history || history.length === 0) {
    return {
      totalWagered: 0,
      totalWon: 0,
      winCount: 0,
      lossCount: 0
    };
  }

  let totalWagered = 0;
  let totalWon = 0;
  let winCount = 0;
  let lossCount = 0;

  history.forEach(game => {
    const betAmount = game.betAmount || game.bet || 0;
    const winAmount = game.winAmount || game.payout || 0;
    const isWin = game.isWin || winAmount > betAmount;

    totalWagered += betAmount;
    totalWon += winAmount;

    if (isWin) {
      winCount++;
    } else {
      lossCount++;
    }
  });

  return {
    totalWagered,
    totalWon,
    winCount,
    lossCount
  };
};

const combinedHistoryReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOAD_COMBINED_HISTORY: {
      const loadedHistory = action.payload || loadSavedHistory();
      const stats = calculateStats(loadedHistory);
      return {
        ...state,
        history: loadedHistory,
        ...stats
      };
    }
      
    case ADD_TO_COMBINED_HISTORY: {
      const updatedHistory = [
        action.payload,
        ...state.history
      ].slice(0, 500); // Keep the last 500 games across all game types
      
      // Save to localStorage
      localStorage.setItem('combinedGameHistory', JSON.stringify(updatedHistory));
      
      // Recalculate stats
      const stats = calculateStats(updatedHistory);
      
      return {
        ...state,
        history: updatedHistory,
        ...stats
      };
    }
      
    case CLEAR_COMBINED_HISTORY:
      localStorage.removeItem('combinedGameHistory');
      return {
        ...initialState,
        history: []
      };
      
    case LOGOUT:
      return {
        ...initialState
      };
      
    default:
      return state;
  }
};

export default combinedHistoryReducer; 