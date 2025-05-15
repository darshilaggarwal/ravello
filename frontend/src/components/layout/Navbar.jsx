import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiMenu, FiX } from 'react-icons/fi';
import { FaHistory } from 'react-icons/fa';
import { logout } from '../../redux/actions/authActions';
import { getProfile } from '../../redux/actions/userActions';
import WalletDisplay from '../wallet/WalletDisplay';
import CombinedHistory from '../games/CombinedHistory';

// Helper component to render the user's avatar
const UserAvatar = ({ profile, size = 8, className = "" }) => {
  if (!profile) return null;
  
  // Check if the avatar is one of our custom avatars
  if (profile.avatarData) {
    try {
      const avatarData = JSON.parse(profile.avatarData);
      return (
        <div className={`h-${size} w-${size} rounded-full overflow-hidden ${className}`}>
          <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id={`gradient-nav-${avatarData.colors.primary}-${avatarData.colors.secondary}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={avatarData.colors.primary} />
                <stop offset="100%" stopColor={avatarData.colors.secondary} />
              </linearGradient>
            </defs>
            <rect 
              width="100" 
              height="100" 
              fill={`url(#gradient-nav-${avatarData.colors.primary}-${avatarData.colors.secondary})`}
              rx="15"
            />
            
            {/* Simplified pattern indicator */}
            {avatarData.pattern === 'circles' && (
              <>
                <circle cx="30%" cy="30%" r="15%" fill={avatarData.colors.accent} opacity="0.6" />
                <circle cx="70%" cy="70%" r="20%" fill={avatarData.colors.accent} opacity="0.5" />
              </>
            )}
            {avatarData.pattern === 'squares' && (
              <>
                <rect x="20%" y="20%" width="25%" height="25%" fill={avatarData.colors.accent} opacity="0.6" rx="8%" />
                <rect x="60%" y="55%" width="30%" height="30%" fill={avatarData.colors.accent} opacity="0.5" rx="8%" />
              </>
            )}
            {avatarData.pattern === 'triangles' && (
              <>
                <polygon points="30,25 10,60 50,60" fill={avatarData.colors.accent} opacity="0.6" />
                <polygon points="70,30 50,70 90,70" fill={avatarData.colors.accent} opacity="0.5" />
              </>
            )}
            {avatarData.pattern === 'hexagons' && (
              <>
                <polygon points="30,15 15,35 30,55 55,55 70,35 55,15" fill={avatarData.colors.accent} opacity="0.6" />
              </>
            )}
            {avatarData.pattern === 'stars' && (
              <>
                <polygon points="50,5 61,40 100,40 68,62 79,95 50,75 21,95 32,62 0,40 39,40" fill={avatarData.colors.accent} opacity="0.5" transform="scale(0.4) translate(75, 50)" />
              </>
            )}
            {avatarData.pattern === 'waves' && (
              <>
                <path d="M0,50 Q25,30 50,50 T100,50 T150,50 T200,50" strokeWidth="10" stroke={avatarData.colors.accent} fill="none" opacity="0.5" />
              </>
            )}
          </svg>
        </div>
      );
    } catch (e) {
      // If JSON parsing fails, fall back to default avatar
      console.error("Error parsing avatar data", e);
    }
  }
  
  // Fall back to profile picture or default avatar
  if (profile.profilePicture && profile.profilePicture !== 'default-profile.jpg') {
    return (
      <img
        src={profile.profilePicture}
        alt={profile.username}
        className={`h-${size} w-${size} rounded-full object-cover ${className}`}
      />
    );
  } else {
    return (
      <div className={`h-${size} w-${size} rounded-full bg-gray-600 flex items-center justify-center overflow-hidden ${className}`}>
        {profile?.username ? (
          <span className="text-white text-sm">{profile.username.charAt(0).toUpperCase()}</span>
        ) : (
          <span className="text-white text-sm">U</span>
        )}
      </div>
    );
  }
};

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const userMenuRef = useRef(null);
  const historyRef = useRef(null);
  
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const { profile } = useSelector(state => state.user);
  
  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (historyRef.current && !historyRef.current.contains(event.target)) {
        setHistoryOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Fetch user profile if authenticated
  useEffect(() => {
    if (isAuthenticated && !profile) {
      console.log('Navbar: Authenticated but no profile, fetching profile...');
      dispatch(getProfile()).catch(err => 
        console.error('Failed to load profile from Navbar:', err)
      );
    }
  }, [isAuthenticated, profile, dispatch]);
  
  // Handle user logout
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  // Toggle user menu
  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
    if (historyOpen) setHistoryOpen(false);
  };
  
  // Toggle history dropdown
  const toggleHistory = () => {
    setHistoryOpen(!historyOpen);
    if (userMenuOpen) setUserMenuOpen(false);
  };
  
  return (
    <nav className="bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <h1 className="text-xl font-bold text-white">Revello</h1>
            </Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link to="/" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Home</Link>
                <Link to="/games/dice" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Dice</Link>
                <Link to="/games/crash" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Crash</Link>
                <Link to="/games/mines" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Mines</Link>
                <Link to="/games/plinko" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Plinko</Link>
                {/* {isDebug && (
                  <Link to="/debug" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                    Debug
                  </Link>
                )} */}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {isAuthenticated ? (
                <>
                  {/* History Dropdown */}
                  <div className="relative mr-4" ref={historyRef}>
                    <button
                      onClick={toggleHistory}
                      className="flex items-center text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                    >
                      <FaHistory className="mr-1" />
                      <span>History</span>
                    </button>
                    
                    {historyOpen && (
                      <div className="origin-top-right absolute right-0 mt-2 w-screen max-w-xl rounded-md shadow-lg z-50">
                        <div className="rounded-md shadow-xs overflow-hidden">
                          <CombinedHistory isDropdown={true} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="flex items-center">
                      {profile && (
                        <div className="mr-4 text-sm font-medium text-white">
                          <WalletDisplay />
                        </div>
                      )}
                      <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="max-w-xs bg-gray-800 rounded-full flex items-center text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                      >
                        <span className="sr-only">Open user menu</span>
                        <UserAvatar profile={profile} size="8" />
                      </button>
                    </div>
                    {userMenuOpen && (
                      <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                        <div className="border-b border-gray-200 pb-2">
                          <div className="flex items-center px-4 py-2">
                            <div className="mr-3">
                              <UserAvatar profile={profile} size="10" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">{profile?.username}</p>
                              <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                            </div>
                          </div>
                        </div>
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Profile
                        </Link>
                        <Link
                          to="/wallet"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Wallet
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Sign out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex space-x-2">
                  <Link
                    to="/login"
                    className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <FiX className="block h-6 w-6" />
              ) : (
                <FiMenu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link to="/" className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Home</Link>
            <Link to="/games/dice" className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Dice</Link>
            <Link to="/games/crash" className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Crash</Link>
            <Link to="/games/mines" className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Mines</Link>
            <Link to="/games/plinko" className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Plinko</Link>
            {process.env.NODE_ENV === 'development' && (
              <Link to="/debug" className="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
                Debug
              </Link>
            )}
            
            {/* Mobile History Link for Authenticated Users */}
            {isAuthenticated && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setHistoryOpen(true);
                }}
                className="w-full text-left text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              >
                <div className="flex items-center">
                  <FaHistory className="mr-2" />
                  History
                </div>
              </button>
            )}
          </div>
          {isAuthenticated ? (
            <div className="pt-4 pb-3 border-t border-gray-700">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <UserAvatar profile={profile} size="10" />
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium leading-none text-white">{profile?.username}</div>
                  <div className="text-sm font-medium leading-none text-gray-400 mt-1">
                    <WalletDisplay showIcon={false} linkToWallet={false} />
                  </div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <Link
                  to="/profile"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  to="/wallet"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Wallet
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-4 pb-3 border-t border-gray-700">
              <div className="px-2 space-y-1">
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar; 