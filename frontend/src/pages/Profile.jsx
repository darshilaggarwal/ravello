import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getProfile, updateProfile, updatePassword } from '../redux/actions/userActions';
import toast from 'react-hot-toast';

const Profile = () => {
  const dispatch = useDispatch();
  const { profile, loading: profileLoading, error: profileError } = useSelector((state) => state.user);
  const [activeTab, setActiveTab] = useState('profile');

  const [profileForm, setProfileForm] = useState({
    username: '',
    email: '',
    profilePicture: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    dispatch(getProfile());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        username: profile.username || '',
        email: profile.email || '',
        profilePicture: profile.profilePicture || '',
      });
    }
  }, [profile]);

  const validateProfileForm = () => {
    const errors = {};
    if (!profileForm.username) {
      errors.username = 'Username is required';
    } else if (profileForm.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    if (!profileForm.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileForm.email)) {
      errors.email = 'Email is invalid';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePasswordForm = () => {
    const errors = {};
    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm({
      ...profileForm,
      [name]: value,
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm({
      ...passwordForm,
      [name]: value,
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    if (validateProfileForm()) {
      setUpdateLoading(true);
      try {
        const message = await dispatch(updateProfile(profileForm));
        toast.success(message || 'Profile updated successfully');
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to update profile');
      } finally {
        setUpdateLoading(false);
      }
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (validatePasswordForm()) {
      setUpdateLoading(true);
      try {
        const message = await dispatch(updatePassword({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }));
        toast.success(message || 'Password updated successfully');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to update password');
      } finally {
        setUpdateLoading(false);
      }
    }
  };

  if (profileLoading && !profile) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="bg-red-600 text-white p-4 rounded mb-6">
        Error: {profileError}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Your Profile</h1>
      
      <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center mb-6">
            <div className="mr-6 mb-4 md:mb-0">
              {profile?.profilePicture && profile.profilePicture !== 'default-profile.jpg' ? (
                <img
                  src={profile.profilePicture}
                  alt={profile.username}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden">
                  {profile?.username ? (
                    <span className="text-white text-2xl">{profile.username.charAt(0).toUpperCase()}</span>
                  ) : (
                    <img 
                      src="https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y" 
                      alt="Default profile" 
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{profile?.username}</h2>
              <p className="text-gray-400">{profile?.email}</p>
              <div className="mt-2 text-lg">
                <span className="text-green-500 font-semibold">Balance: ${profile?.balance?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-700">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                Edit Profile
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`ml-8 py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'security'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                Security
              </button>
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-300">
                    Username
                  </label>
                  <div className="mt-1">
                    <input
                      id="username"
                      name="username"
                      type="text"
                      value={profileForm.username}
                      onChange={handleProfileChange}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        profileErrors.username ? 'border-red-300' : 'border-gray-600'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white sm:text-sm`}
                    />
                    {profileErrors.username && <p className="mt-1 text-sm text-red-500">{profileErrors.username}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                    Email Address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        profileErrors.email ? 'border-red-300' : 'border-gray-600'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white sm:text-sm`}
                    />
                    {profileErrors.email && <p className="mt-1 text-sm text-red-500">{profileErrors.email}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="profilePicture" className="block text-sm font-medium text-gray-300">
                    Profile Picture URL
                  </label>
                  <div className="mt-1">
                    <input
                      id="profilePicture"
                      name="profilePicture"
                      type="text"
                      value={profileForm.profilePicture}
                      onChange={handleProfileChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white sm:text-sm"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {updateLoading ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300">
                    Current Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        passwordErrors.currentPassword ? 'border-red-300' : 'border-gray-600'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white sm:text-sm`}
                    />
                    {passwordErrors.currentPassword && (
                      <p className="mt-1 text-sm text-red-500">{passwordErrors.currentPassword}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300">
                    New Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        passwordErrors.newPassword ? 'border-red-300' : 'border-gray-600'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white sm:text-sm`}
                    />
                    {passwordErrors.newPassword && (
                      <p className="mt-1 text-sm text-red-500">{passwordErrors.newPassword}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                    Confirm New Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        passwordErrors.confirmPassword ? 'border-red-300' : 'border-gray-600'
                      } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white sm:text-sm`}
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-500">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {updateLoading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 