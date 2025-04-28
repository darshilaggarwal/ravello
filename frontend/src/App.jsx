import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import NotFound from './pages/NotFound';
import Debug from './pages/Debug';

// Game Pages
import Dice from './pages/games/Dice';
import Crash from './pages/games/Crash';
import Mines from './pages/games/Mines';
import Plinko from './pages/games/Plinko';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';
import SocketInitializer from './components/socket/SocketInitializer';

// Actions
import { checkAuth } from './redux/actions/authActions';
import { getProfile } from './redux/actions/userActions';

const App = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDebug] = useState(process.env.NODE_ENV === 'development');
  const { isAuthenticated } = useSelector(state => state.auth);
  const { profile } = useSelector(state => state.user);

  useEffect(() => {
    const loadApp = async () => {
      try {
        setLoading(true);
        console.log('Checking authentication status...');
        const authResult = await dispatch(checkAuth());
        console.log('Authentication check result:', authResult);
        
        // If authenticated, fetch user profile
        if (authResult.isAuthenticated) {
          console.log('User is authenticated, fetching profile...');
          try {
            await dispatch(getProfile());
            console.log('Profile loaded successfully');
          } catch (profileErr) {
            console.error('Failed to load profile:', profileErr);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Authentication check failed:', err);
        setError('Failed to load application. Please refresh the page.');
        setLoading(false);
      }
    };

    loadApp();
  }, [dispatch]);
  
  // Fetch profile whenever auth status changes to authenticated
  useEffect(() => {
    if (isAuthenticated && !profile && !loading) {
      console.log('Authentication status changed to authenticated, fetching profile...');
      dispatch(getProfile())
        .catch(err => console.error('Failed to load profile after auth change:', err));
    }
  }, [isAuthenticated, profile, loading, dispatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading application...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-4">
        <div className="text-center">
          <h1 className="text-red-500 text-2xl mb-4">Error</h1>
          <p className="mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" />
      <ToastContainer position="top-right" autoClose={3000} />
      <SocketInitializer />
      <Routes>
        {/* Auth routes with AuthLayout */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Route>
        
        {/* Main app routes with MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          
          {/* Game Routes (don't require authentication) */}
          <Route path="/games/dice" element={<Dice />} />
          <Route path="/games/crash" element={<Crash />} />
          <Route path="/games/mines" element={<Mines />} />
          <Route path="/games/plinko" element={<Plinko />} />
          
          {/* Debug Route (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <Route path="/debug" element={<Debug />} />
          )}
          
          {/* Protected Routes */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/wallet" element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          } />
          
          {/* Not Found */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
 