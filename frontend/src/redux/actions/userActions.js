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
    
    // Changed to use '/api/auth/me' endpoint which returns the authenticated user
    const response = await api.get('/api/auth/me');
    console.log('Profile response:', response.data);
    
    // Check if we have a mockUserData in localStorage (for development mode)
    let userData = response.data;
    const localStorageData = localStorage.getItem('mockUserData');
    
    // If we're in development mode and have localStorage wallet data, preserve it
    if (process.env.NODE_ENV === 'development' && localStorageData) {
      try {
        const parsedData = JSON.parse(localStorageData);
        if (parsedData && typeof parsedData.balance === 'number') {
          // Use the localStorage balance instead of the database balance
          userData = {
            ...userData,
            balance: parsedData.balance
          };
          console.log('Using localStorage balance:', parsedData.balance);
        }
      } catch (e) {
        console.error('Error parsing localStorage data:', e);
      }
    }
    
    // No need to extract data.data since the API returns the user object directly
    dispatch({
      type: GET_PROFILE_SUCCESS,
      payload: userData
    });
    
    return userData;
  } catch (error) {
    console.error('Profile fetch error:', error.response?.data || error.message);
    
    dispatch({
      type: GET_PROFILE_FAILURE,
      payload: error.response?.data?.message || error.message || 'Failed to load profile'
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
export const updateBalance = (newBalance) => ({
  type: UPDATE_BALANCE,
  payload: newBalance
}); 