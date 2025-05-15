import {
  GET_PROFILE_REQUEST,
  GET_PROFILE_SUCCESS,
  GET_PROFILE_FAILURE,
  UPDATE_PROFILE_REQUEST,
  UPDATE_PROFILE_SUCCESS,
  UPDATE_PROFILE_FAILURE,
  UPDATE_PASSWORD_REQUEST,
  UPDATE_PASSWORD_SUCCESS,
  UPDATE_PASSWORD_FAILURE,
  GET_TRANSACTIONS_REQUEST,
  GET_TRANSACTIONS_SUCCESS,
  GET_TRANSACTIONS_FAILURE,
  UPDATE_BALANCE
} from './types';
import api from '../../utils/api';

// Get user profile
export const getProfile = () => async (dispatch) => {
  try {
    dispatch({ type: GET_PROFILE_REQUEST });
    
    console.log('Getting user profile...');
    
    // Get the user profile from the backend
    const response = await api.get('/api/auth/me');
    console.log('Profile response:', response.data);
    
    // Always use the server's user data
    const userData = response.data;
    
    dispatch({
      type: GET_PROFILE_SUCCESS,
      payload: userData
    });
    
    return userData;
  } catch (error) {
    dispatch({
      type: GET_PROFILE_FAILURE,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
    });
    throw error;
  }
};

// Update user profile
export const updateProfile = (userData) => async (dispatch) => {
  try {
    dispatch({ type: UPDATE_PROFILE_REQUEST });

    const res = await api.put('/api/users/me', userData);

    dispatch({
      type: UPDATE_PROFILE_SUCCESS,
      payload: res.data.data
    });

    return res.data;
  } catch (error) {
    dispatch({
      type: UPDATE_PROFILE_FAILURE,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
    });
    throw error;
  }
};

// Update user password
export const updatePassword = (passwordData) => async (dispatch) => {
  try {
    dispatch({ type: UPDATE_PASSWORD_REQUEST });

    const res = await api.put('/api/users/update-password', passwordData);

    dispatch({
      type: UPDATE_PASSWORD_SUCCESS,
      payload: res.data.message
    });

    return res.data;
  } catch (error) {
    dispatch({
      type: UPDATE_PASSWORD_FAILURE,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
    });
    throw error;
  }
};

// Get user transactions
export const getTransactions = (page = 1, limit = 10) => async (dispatch) => {
  try {
    dispatch({ type: GET_TRANSACTIONS_REQUEST });

    const res = await api.get(`/api/users/transactions?page=${page}&limit=${limit}`);

    dispatch({
      type: GET_TRANSACTIONS_SUCCESS,
      payload: res.data.data
    });

    return res.data;
  } catch (error) {
    dispatch({
      type: GET_TRANSACTIONS_FAILURE,
      payload:
        error.response && error.response.data.message
          ? error.response.data.message
          : error.message
    });
    throw error;
  }
};

// Update user balance (used by game actions)
export const updateBalance = (newBalance) => async (dispatch, getState) => {
  try {
    // First update balance in Redux for immediate UI feedback
    dispatch({
      type: UPDATE_BALANCE,
      payload: newBalance
    });
    
    // Always sync with backend to ensure persistence
    await api.put('/api/users/balance', { balance: newBalance });
    
    return newBalance;
  } catch (error) {
    console.error('Error updating balance:', error);
    throw error;
  }
}; 