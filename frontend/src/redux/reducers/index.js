import { combineReducers } from 'redux';
import authReducer from './authReducer';
import userReducer from './userReducer';
import diceReducer from './games/diceReducer';
import crashReducer from './games/crashReducer';
import minesReducer from './games/minesReducer';
import plinkoReducer from './games/plinkoReducer';

const gamesReducer = combineReducers({
  dice: diceReducer,
  crash: crashReducer,
  mines: minesReducer,
  plinko: plinkoReducer
});

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  games: gamesReducer
});

export default rootReducer; 