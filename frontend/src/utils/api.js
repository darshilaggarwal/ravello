import axios from 'axios';
import Cookies from 'js-cookie';
import { API_URL } from '../config/constants';
import store from '../redux/store';
import { refreshToken, logout } from '../redux/actions/authActions';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  // Ensure data is properly stringified JSON
  transformRequest: [(data, headers) => {
    // Don't transform FormData
    if (data instanceof FormData) {
      return data;
    }
    
    // Return stringified data if it's an object
    if (data && typeof data === 'object') {
      return JSON.stringify(data);
    }
    return data;
  }]
});

// Request interceptor to add token to every request
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    const requestUrl = config.url;
    
    console.log(`API Request to ${requestUrl}:`, { 
      method: config.method, 
      hasToken: !!token,
      data: config.data ? '(data present)' : '(no data)'
    });
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.log('No auth token available for request');
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    console.log(`API Response from ${response.config.url}:`, {
      status: response.status,
      data: response.data ? '(data present)' : '(no data)'
    });
    return response;
  },
  async (error) => {
    if (error.response) {
      console.error(`API Error from ${error.config?.url}:`, {
        status: error.response.status,
        data: error.response.data,
        message: error.message
      });
    } else {
      console.error('API Error (no response):', error.message);
    }
    
    const originalRequest = error.config;
    
    // If the error is 401 and the request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Check if this is not the refresh token endpoint to avoid infinite loops
      if (!originalRequest.url.includes('/api/auth/refresh-token')) {
        try {
          // Try to refresh the token
          console.log('Attempting to refresh token...');
          const refreshResult = await store.dispatch(refreshToken());
          
          // If token refresh successful, update the authorization header
          const newToken = Cookies.get('token');
          if (newToken) {
            console.log('Token refreshed successfully');
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          } else {
            console.warn('Token refresh did not produce a new token');
            // Force logout if refresh didn't work
            store.dispatch(logout());
            return Promise.reject(new Error('Authentication failed. Please log in again.'));
          }
        } catch (refreshError) {
          // If refresh token fails, log out the user
          console.error('Token refresh failed:', refreshError);
          store.dispatch(logout());
          return Promise.reject(new Error('Authentication expired. Please log in again.'));
        }
      }
    }
    
    // For network errors, provide a more user-friendly message
    if (!error.response) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    
    return Promise.reject(error);
  }
);

export default api; 