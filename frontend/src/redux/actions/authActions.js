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
    
    // Use the user data directly from the server response
    let userData = { ...user };
    
    // Set default balance for new users if needed
    if (userData.balance === undefined || userData.balance === null) {
      userData.balance = 10000;
    }
    
    dispatch({
      type: LOGIN_SUCCESS,
      payload: userData
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
    // Ensure new users get 10,000 as signup reward
    const userDataWithBalance = {
      ...userData,
      balance: 10000
    };
    
    const response = await axios.post('/api/auth/register', userDataWithBalance);
    
    dispatch({
      type: REGISTER_SUCCESS,
      payload: response.data.message || 'Registration successful'
    });
    
    // After successful registration, attempt to login automatically
    try {
      await dispatch(login({
        email: userData.email,
        password: userData.password
      }));
      return { success: true, message: 'Registration and login successful' };
    } catch (loginError) {
      // If auto-login fails, still return success but with a message to login manually
      return { 
        success: true, 
        message: 'Registration successful. Please log in with your credentials.',
        requireManualLogin: true
      };
    }
  } catch (error) {
    dispatch({
      type: REGISTER_FAILURE,
      payload: error.response?.data?.message || error.message || 'Registration failed'
    });
    
    throw error;
  }
};

// Logout
export const logout = () => async (dispatch) => {
  try {
    // If we're authenticated, send the current balance to the server before logging out
    const token = Cookies.get('token');
    if (token) {
      const mockUserData = localStorage.getItem('mockUserData');
      if (mockUserData) {
        try {
          const userData = JSON.parse(mockUserData);
          if (userData && typeof userData.balance === 'number') {
            // Send the current balance to the server before logging out
            await axios.put('/api/users/update-balance', { balance: userData.balance });
            console.log('Updated server with current balance:', userData.balance);
          }
        } catch (e) {
          console.error('Error updating balance before logout:', e);
        }
      }
    }
  } catch (error) {
    console.error('Error during balance update on logout:', error);
  } finally {
    // Clear tokens
    clearTokens();
    
    // Clear localStorage
    localStorage.removeItem('mockUserData');
    
    dispatch({ type: LOGOUT });
    
    return { success: true, message: 'Logged out successfully' };
  }
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
    
    // Always use the server's balance
    let userData = response.data;
    
    // Store the user data in localStorage for development purposes
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('mockUserData', JSON.stringify({
        balance: userData.balance
      }));
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