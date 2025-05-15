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
  CRASH_RESET_GAME,
  CRASH_CLEAR_HISTORY,
  LOGOUT
} from '../../actions/types';

// Load existing history from localStorage
const loadSavedHistory = () => {
  try {
    const savedHistory = localStorage.getItem('crashHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  } catch (error) {
    console.error('Error loading crash history:', error);
    return [];
  }
};

const initialState = {
  status: 'waiting', // waiting, in_progress, crashed
  currentMultiplier: 0.0,
  crashPoint: null,
  timeElapsed: 0,
  history: loadSavedHistory(),
  players: [],
  myBet: null,
  betLoading: false,
  betError: null,
  cashoutLoading: false,
  cashoutError: null,
  historyLoading: false,
  historyError: null
};

const crashReducer = (state = initialState, action) => {
  switch (action.type) {
    case CRASH_GAME_START:
      return {
        ...state,
        status: 'in_progress',
        currentMultiplier: 0.0,
        crashPoint: action.payload.crashPoint,
        timeElapsed: 0,
        myBet: null
      };
      
    case CRASH_GAME_TICK:
      return {
        ...state,
        currentMultiplier: action.payload.currentMultiplier,
        timeElapsed: action.payload.timeElapsed
      };
      
    case CRASH_GAME_CRASH:
      let updatedHistory = [...(action.payload.history || [])];
      
      if (state.myBet && !state.myBet.cashedOut) {
        updatedHistory = [
          {
            id: `crash-${Date.now()}`,
            betAmount: state.myBet.amount,
            winAmount: 0,
            crashPoint: action.payload.crashPoint,
            timestamp: Date.now(),
            isWin: false,
            type: 'crash'
          },
          ...updatedHistory
        ];
      }
      
      return {
        ...state,
        status: 'crashed',
        crashPoint: action.payload.crashPoint,
        history: updatedHistory.slice(0, 50)
      };
      
    case CRASH_GAME_WAITING:
      return {
        ...state,
        status: 'waiting'
      };
      
    case CRASH_PLACE_BET_REQUEST:
      return {
        ...state,
        betLoading: true,
        betError: null
      };
      
    case CRASH_PLACE_BET_SUCCESS:
      return {
        ...state,
        betLoading: false,
        players: [...state.players, action.payload.player],
        myBet: action.payload.player
      };
      
    case CRASH_PLACE_BET_FAILURE:
      return {
        ...state,
        betLoading: false,
        betError: action.payload.error
      };
      
    case CRASH_CASHOUT_REQUEST:
      return {
        ...state,
        cashoutLoading: true,
        cashoutError: null
      };
      
    case CRASH_CASHOUT_SUCCESS:
      const profit = action.payload.payout - (state.myBet?.amount || 0);
      const updatedCashoutHistory = [
        {
          id: `crash-${Date.now()}`,
          betAmount: state.myBet?.amount || 0,
          winAmount: action.payload.payout,
          crashPoint: action.payload.multiplier,
          timestamp: Date.now(),
          isWin: true,
          type: 'cashout'
        },
        ...state.history
      ];
      
      return {
        ...state,
        cashoutLoading: false,
        players: state.players.map(player => 
          player.id === action.payload.id 
            ? { ...player, cashedOut: true, cashedOutAt: action.payload.multiplier, profit }
            : player
        ),
        myBet: state.myBet?.id === action.payload.id 
          ? { ...state.myBet, cashedOut: true, cashedOutAt: action.payload.multiplier, profit }
          : state.myBet,
        history: updatedCashoutHistory.slice(0, 50)
      };
      
    case CRASH_CASHOUT_FAILURE:
      return {
        ...state,
        cashoutLoading: false,
        cashoutError: action.payload.error
      };
      
    case CRASH_GET_HISTORY_REQUEST:
      return {
        ...state,
        historyLoading: true,
        historyError: null
      };
      
    case CRASH_GET_HISTORY_SUCCESS:
      return {
        ...state,
        historyLoading: false,
        history: action.payload.history
      };
      
    case CRASH_GET_HISTORY_FAILURE:
      return {
        ...state,
        historyLoading: false,
        historyError: action.payload.error
      };
      
    case CRASH_RESET_GAME:
      return {
        ...initialState,
        history: state.history
      };
      
    case CRASH_CLEAR_HISTORY:
      localStorage.removeItem('crashHistory');
      return {
        ...state,
        history: []
      };
      
    case LOGOUT:
      return {
        ...initialState,
        history: []
      };
      
    default:
      return state;
  }
};

export default crashReducer; 