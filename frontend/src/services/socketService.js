import { io } from 'socket.io-client';
import { API_URL } from '../config/constants';
import store from '../redux/store';
import {
  initCrashState,
  updateGameStatus,
  startGame,
  updateMultiplier,
  gameCrash,
  newBet, 
  playerCashout
} from '../redux/actions/games/crashActions';

let socket;

export const initializeSocket = (token) => {
  if (socket) return socket;

  socket = io(API_URL, {
    auth: {
      token
    },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  // Connection events
  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
  });

  // Game specific events
  setupCrashGameEvents();

  return socket;
};

// Setup crash game event listeners
const setupCrashGameEvents = () => {
  if (!socket) return;

  // Game state initialization
  socket.on('crash:init', (data) => {
    store.dispatch(initCrashState(data));
  });

  // Game status updates
  socket.on('crash:status', (data) => {
    store.dispatch(updateGameStatus(data));
  });

  // Game start
  socket.on('crash:start', (data) => {
    store.dispatch(startGame(data));
  });

  // Multiplier updates
  socket.on('crash:multiplier', (multiplier) => {
    store.dispatch(updateMultiplier(multiplier));
  });

  // Game crash
  socket.on('crash:crash', (data) => {
    store.dispatch(gameCrash(data));
  });

  // New bet
  socket.on('crash:new_bet', (data) => {
    store.dispatch(newBet(data));
  });

  // Player cashout
  socket.on('crash:player_cashout', (data) => {
    store.dispatch(playerCashout(data));
  });
};

// Get socket instance
export const getSocket = () => socket;

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Join a game room
export const joinGameRoom = (game) => {
  if (!socket) return;
  socket.emit('join', { game });
};

// Leave a game room
export const leaveGameRoom = (game) => {
  if (!socket) return;
  socket.emit('leave', { game });
}; 