import Cookies from 'js-cookie';
import {
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,
  LOGOUT,
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
  AUTH_CHECK_FAILURE
} from '../actions/types';

// Helper function to check if we already have a token
const hasValidToken = () => {
  return !!Cookies.get('token');
};

const initialState = {
  isAuthenticated: hasValidToken(), // Initialize based on token presence
  user: null,
  loading: false,
  error: null,
  message: null
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOGIN_REQUEST:
      console.log('Auth reducer: LOGIN_REQUEST');
      return {
        ...state,
        loading: true,
        error: null,
        message: null
      };
      
    case LOGIN_SUCCESS:
      console.log('Auth reducer: LOGIN_SUCCESS');
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false,
        error: null,
        message: 'Login successful'
      };
      
    case LOGIN_FAILURE:
      console.log('Auth reducer: LOGIN_FAILURE with error:', action.payload);
      // On login failure, clear any existing tokens
      Cookies.remove('token');
      Cookies.remove('refreshToken');
      
      return {
        ...state,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };
      
    case REGISTER_REQUEST:
    case FORGOT_PASSWORD_REQUEST:
    case RESET_PASSWORD_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        message: null
      };
      
    case REGISTER_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        message: action.payload
      };
      
    case FORGOT_PASSWORD_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        message: action.payload
      };
      
    case RESET_PASSWORD_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        message: action.payload
      };
      
    case REGISTER_FAILURE:
    case FORGOT_PASSWORD_FAILURE:
    case RESET_PASSWORD_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
      
    case LOGOUT:
      console.log('Auth reducer: LOGOUT');
      // Ensure tokens are removed on logout
      Cookies.remove('token');
      Cookies.remove('refreshToken');
      
      return {
        ...initialState,
        isAuthenticated: false, // Explicitly set to false
        message: 'Logged out successfully'
      };
      
    case AUTH_CHECK_SUCCESS:
      console.log('Auth reducer: AUTH_CHECK_SUCCESS');
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload
      };
      
    case AUTH_CHECK_FAILURE:
      console.log('Auth reducer: AUTH_CHECK_FAILURE');
      // Ensure tokens are removed on auth check failure
      Cookies.remove('token');
      Cookies.remove('refreshToken');
      
      return {
        ...initialState,
        isAuthenticated: false // Explicitly set to false
      };
      
    default:
      return state;
  }
};

export default authReducer; 