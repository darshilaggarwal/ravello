import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { initializeSocket, disconnectSocket } from '../../services/socketService';
import Cookies from 'js-cookie';

const SocketInitializer = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    // If user is authenticated, initialize socket connection
    if (isAuthenticated) {
      const token = Cookies.get('token');
      if (token) {
        initializeSocket(token);
      }
    } else {
      // If user is not authenticated, disconnect socket
      disconnectSocket();
    }

    // Cleanup on unmount
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated]);

  // This component doesn't render anything
  return null;
};

export default SocketInitializer; 