import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { checkAuth } from '../redux/actions/authActions';
import Cookies from 'js-cookie';
import axios from '../utils/api';

const Debug = () => {
  const dispatch = useDispatch();
  const auth = useSelector(state => state.auth);
  const user = useSelector(state => state.user);
  
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState({});

  // Function to display token information
  const getTokenInfo = () => {
    const token = Cookies.get('token');
    const refreshToken = Cookies.get('refreshToken');
    
    return {
      hasToken: !!token,
      tokenValue: token ? `${token.substring(0, 15)}...` : 'No token',
      hasRefreshToken: !!refreshToken,
      refreshTokenValue: refreshToken ? `${refreshToken.substring(0, 15)}...` : 'No refresh token'
    };
  };

  // Function to test an endpoint
  const testEndpoint = async (endpoint, method = 'GET', data = null) => {
    const key = `${method}_${endpoint}`;
    setLoading(prev => ({ ...prev, [key]: true }));
    
    try {
      let response;
      if (method === 'GET') {
        response = await axios.get(endpoint);
      } else if (method === 'POST') {
        response = await axios.post(endpoint, data);
      }
      
      setTestResults(prev => ({
        ...prev,
        [key]: {
          success: true,
          data: response.data,
          status: response.status
        }
      }));
      toast.success(`${method} ${endpoint} successful`);
    } catch (error) {
      console.error(`Error testing ${method} ${endpoint}:`, error);
      setTestResults(prev => ({
        ...prev,
        [key]: {
          success: false,
          error: error.response?.data || error.message,
          status: error.response?.status
        }
      }));
      toast.error(`${method} ${endpoint} failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // Function to refresh auth state
  const refreshAuth = () => {
    dispatch(checkAuth());
    toast.info("Auth check dispatched");
  };

  // Function to clear all cookies
  const clearCookies = () => {
    Cookies.remove('token');
    Cookies.remove('refreshToken');
    toast.info("Cookies cleared");
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Authentication State</h2>
          <div className="text-sm">
            <p>isAuthenticated: <span className={auth.isAuthenticated ? "text-green-500" : "text-red-500"}>{auth.isAuthenticated ? "true" : "false"}</span></p>
            <p>Loading: {auth.loading ? "true" : "false"}</p>
            <p>Error: {auth.error ? JSON.stringify(auth.error) : "null"}</p>
            <p>Message: {auth.message || "null"}</p>
          </div>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">User State</h2>
          <div className="text-sm">
            <p>Profile: {user.profile ? JSON.stringify(user.profile).substring(0, 100) + "..." : "null"}</p>
            <p>Loading: {user.loading ? "true" : "false"}</p>
            <p>Error: {user.error ? JSON.stringify(user.error) : "null"}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded mb-8">
        <h2 className="text-xl font-semibold mb-2">Token Information</h2>
        <div className="text-sm">
          {Object.entries(getTokenInfo()).map(([key, value]) => (
            <p key={key}>{key}: <span className={key.includes('has') && value ? "text-green-500" : key.includes('has') ? "text-red-500" : ""}>{typeof value === 'boolean' ? value.toString() : value}</span></p>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div>
          <h2 className="text-xl font-semibold mb-2">Authentication Actions</h2>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={refreshAuth}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Refresh Auth State
            </button>
            <button 
              onClick={clearCookies}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Clear Cookies
            </button>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-2">Test Endpoints</h2>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => testEndpoint('/api/health')}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              disabled={loading['GET_/api/health']}
            >
              {loading['GET_/api/health'] ? 'Testing...' : 'Test Health Endpoint'}
            </button>
            <button 
              onClick={() => testEndpoint('/api/auth/me')}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
              disabled={loading['GET_/api/auth/me']}
            >
              {loading['GET_/api/auth/me'] ? 'Testing...' : 'Test Auth Check'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
        <h2 className="text-xl font-semibold mb-2">Test Results</h2>
        <div className="text-sm">
          {Object.entries(testResults).map(([key, result]) => (
            <div key={key} className="mb-4">
              <h3 className="font-semibold">{key}</h3>
              <p>Success: <span className={result.success ? "text-green-500" : "text-red-500"}>{result.success ? "true" : "false"}</span></p>
              <p>Status: {result.status}</p>
              <p>Data/Error:</p>
              <pre className="bg-gray-200 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                {JSON.stringify(result.success ? result.data : result.error, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Debug; 