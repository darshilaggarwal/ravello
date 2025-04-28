import Cookies from 'js-cookie';
import {
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,
  REGISTER_REQUEST,
  REGISTER_SUCCESS,
  REGISTER_FAILURE,
  FORGOT_PASSWORD_REQUEST,
  FORGOT_PASSWORD_SUCCESS,
  FORGOT_PASSWORD_FAILURE,
  RESET_PASSWORD_REQUEST,
  RESET_PASSWORD_SUCCESS,
  RESET_PASSWORD_FAILURE,
  AUTH_CHECK_SUCCESS,
  AUTH_CHECK_FAILURE,
  LOGOUT
} from './types';
import axios from '../../utils/api';
import { API_URL } from '../../config/constants';

// Helper function to save tokens to cookies
const saveTokens = (token, refreshToken) => {
  console.log('Saving tokens to cookies');
  if (!token || !refreshToken) {
    console.error('Invalid tokens received:', { token, refreshToken });
    return false;
  }
  
  // Set cookies with secure options
  const inOneWeek = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
  Cookies.set('token', token, { expires: inOneWeek, secure: process.env.NODE_ENV === 'production' });
  Cookies.set('refreshToken', refreshToken, { expires: inOneWeek, secure: process.env.NODE_ENV === 'production' });
  
  // Update axios headers
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  return true;
};

// Helper function to clear tokens
const clearTokens = () => {
  console.log('Clearing tokens from cookies');
  Cookies.remove('token');
  Cookies.remove('refreshToken');
  delete axios.defaults.headers.common['Authorization'];
};

// Login
export const login = (credentials) => async (dispatch) => {
  console.log('Login action dispatched with:', credentials.email);
  dispatch({ type: LOGIN_REQUEST });
  
  try {
    const response = await axios.post('/api/auth/login', credentials);
    console.log('Login response:', response.data);
    
    const { token, refreshToken, user } = response.data;
    
    if (!token || !refreshToken || !user) {
      console.error('Invalid login response format:', response.data);
      throw new Error('Invalid response from server. Missing token or user data.');
    }
    
    const saved = saveTokens(token, refreshToken);
    if (!saved) {
      throw new Error('Failed to save authentication tokens');
    }
    
    // Initialize localStorage wallet data for development mode
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('mockUserData', JSON.stringify({
        balance: user.balance
      }));
      console.log('Initialized localStorage wallet with balance:', user.balance);
    }
    
    dispatch({
      type: LOGIN_SUCCESS,
      payload: user
    });
    
    return { success: true, message: 'Login successful' };
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    
    // Clear any existing tokens on login failure
    clearTokens();
    
    dispatch({
      type: LOGIN_FAILURE,
      payload: error.response?.data?.message || error.message || 'Login failed'
    });
    
    throw error;
  }
};

// Register
export const register = (userData) => async (dispatch) => {
  dispatch({ type: REGISTER_REQUEST });
  
  try {
    const response = await axios.post('/api/auth/register', userData);
    
    dispatch({
      type: REGISTER_SUCCESS,
      payload: response.data.message || 'Registration successful'
    });
    
    return { success: true, message: response.data.message || 'Registration successful' };
  } catch (error) {
    dispatch({
      type: REGISTER_FAILURE,
      payload: error.response?.data?.message || error.message || 'Registration failed'
    });
    
    throw error;
  }
};

// Logout
export const logout = () => (dispatch) => {
  clearTokens();
  
  dispatch({ type: LOGOUT });
  
  return { success: true, message: 'Logged out successfully' };
};

// Check Authentication
export const checkAuth = () => async (dispatch) => {
  const token = Cookies.get('token');
  
  if (!token) {
    console.log('No token found, auth check returning false');
    dispatch({ type: AUTH_CHECK_FAILURE });
    return { isAuthenticated: false };
  }
  
  try {
    console.log('Token found, checking with backend');
    // Set token in headers for this request
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    const response = await axios.get('/api/auth/me');
    console.log('Auth check response:', response.data);
    
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
          console.log('Using localStorage balance in auth check:', parsedData.balance);
        }
      } catch (e) {
        console.error('Error parsing localStorage data:', e);
      }
    }
    
    dispatch({
      type: AUTH_CHECK_SUCCESS,
      payload: userData
    });
    
    return { isAuthenticated: true, user: userData };
  } catch (error) {
    console.error('Auth check error:', error.response?.data || error.message);
    
    // Clear tokens if they're invalid
    clearTokens();
    
    dispatch({ type: AUTH_CHECK_FAILURE });
    
    return { isAuthenticated: false, error: error.response?.data || error.message };
  }
};

// Forgot Password
export const forgotPassword = (email) => async (dispatch) => {
  dispatch({ type: FORGOT_PASSWORD_REQUEST });
  
  try {
    const response = await axios.post('/api/auth/forgot-password', { email });
    
    dispatch({
      type: FORGOT_PASSWORD_SUCCESS,
      payload: response.data.message || 'Password reset email sent'
    });
    
    return { success: true, message: response.data.message };
  } catch (error) {
    dispatch({
      type: FORGOT_PASSWORD_FAILURE,
      payload: error.response?.data?.message || error.message || 'Failed to send reset email'
    });
    
    throw error;
  }
};

// Reset Password
export const resetPassword = (token, password) => async (dispatch) => {
  dispatch({ type: RESET_PASSWORD_REQUEST });
  
  try {
    const response = await axios.post(`/api/auth/reset-password/${token}`, { password });
    
    dispatch({
      type: RESET_PASSWORD_SUCCESS,
      payload: response.data.message || 'Password reset successful'
    });
    
    return { success: true, message: response.data.message };
  } catch (error) {
    dispatch({
      type: RESET_PASSWORD_FAILURE,
      payload: error.response?.data?.message || error.message || 'Failed to reset password'
    });
    
    throw error;
  }
};

// Refresh token
export const refreshToken = () => async (dispatch) => {
  const storedRefreshToken = Cookies.get('refreshToken');

  if (!storedRefreshToken) {
    dispatch({ type: AUTH_CHECK_FAILURE });
    return Promise.reject('No refresh token');
  }

  try {
    // Use direct axios call without the token
    const res = await axios.post(`${API_URL}/api/auth/refresh`, {
      refreshToken: storedRefreshToken
    });

    const { token, refreshToken, user } = res.data.data;
    saveTokens(token, refreshToken);

    dispatch({
      type: AUTH_CHECK_SUCCESS,
      payload: user
    });

    return res.data;
  } catch (error) {
    dispatch({ type: AUTH_CHECK_FAILURE });
    clearTokens();
    return Promise.reject(error);
  }
}; 