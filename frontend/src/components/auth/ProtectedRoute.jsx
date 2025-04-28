import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { getProfile } from '../../redux/actions/userActions';
import { toast } from 'react-hot-toast';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, loading: authLoading, error: authError } = useSelector(state => state.auth);
  const { profile, loading: profileLoading, error: profileError } = useSelector(state => state.user);

  // Debug authentication state
  useEffect(() => {
    console.log('ProtectedRoute state:', { 
      isAuthenticated, 
      authLoading, 
      authError, 
      hasProfile: !!profile, 
      profileLoading, 
      profileError,
      path: location.pathname
    });
  }, [isAuthenticated, authLoading, authError, profile, profileLoading, profileError, location]);

  // Fetch user profile if authenticated but profile not loaded
  useEffect(() => {
    if (isAuthenticated && !profile && !profileLoading) {
      console.log('Fetching user profile in ProtectedRoute');
      dispatch(getProfile())
        .then(result => {
          console.log('Profile fetch successful:', result);
        })
        .catch(err => {
          console.error('Profile fetch failed:', err);
          toast.error('Failed to load user profile');
        });
    }
  }, [isAuthenticated, profile, profileLoading, dispatch]);

  // Show loading spinner while auth is being checked
  if (authLoading || (isAuthenticated && profileLoading)) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-3 text-white">Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login from:', location.pathname);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute; 