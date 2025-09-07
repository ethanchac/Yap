import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, UserPlus, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../../services/config';
import { useTheme } from '../../../contexts/ThemeContext';

const FollowerModal = ({ isOpen, onClose, userId, isOwnProfile }) => {
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const getProfilePictureUrl = (profilePicture) => {
    if (profilePicture?.trim()) {
      return profilePicture.startsWith('http')
        ? profilePicture
        : `${API_BASE_URL}/uploads/profile_pictures/${profilePicture}`;
    }
    return "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ccircle cx='50' cy='35' r='15' fill='%23bdbdbd'/%3E%3Cellipse cx='50' cy='85' rx='25' ry='20' fill='%23bdbdbd'/%3E%3C/svg%3E";
  };

  const fetchFollowers = async () => {
    try {
      setLoading(true);
      setError(null);

      let url;
      let targetUserId = userId;
      
      if (isOwnProfile) {
        // For own profile, get current user ID from token
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            targetUserId = payload.sub || payload.user_id || payload._id || payload.id;
          } catch (e) {
            console.error('Error decoding token:', e);
            // If token parsing fails, fall back to 'me' endpoint
            url = `${API_BASE_URL}/users/me/followers`;
            targetUserId = null;
          }
        }
      }
      
      if (!url) {
        url = `${API_BASE_URL}/users/${targetUserId}/followers`;
      }

      console.log('Fetching followers from:', url);
      console.log('Target user ID:', targetUserId);

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      console.log('Followers response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Followers API error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch followers');
      }

      const data = await response.json();
      console.log('Followers data received:', data);
      setFollowers(data.followers || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching followers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (followerId) => {
    if (actionLoading[followerId]) return;
    
    setActionLoading(prev => ({ ...prev, [followerId]: true }));
    try {
      const response = await fetch(`${API_BASE_URL}/users/${followerId}/follow`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update follow status');
      }
      
      const data = await response.json();
      
      // Update the follower's follow status in the list
      setFollowers(prev => prev.map(follower => 
        follower._id === followerId 
          ? { ...follower, is_following: data.following }
          : follower
      ));
      
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [followerId]: false }));
    }
  };

  const handleUserClick = (clickedUserId) => {
    onClose();
    navigate(`/profile/${clickedUserId}`);
  };

  useEffect(() => {
    if (isOpen) {
      fetchFollowers();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, userId]);

  if (!isOpen) return null;

  // Create unique class name for this modal instance
  const scrollbarClass = `follower-modal-scrollbar-${isDarkMode ? 'dark' : 'light'}`;

  return createPortal(
    <>
      <style>
        {`
          .${scrollbarClass}::-webkit-scrollbar {
            width: 8px;
          }
          
          .${scrollbarClass}::-webkit-scrollbar-track {
            background: ${isDarkMode ? '#2a2a2a' : '#f1f1f1'};
            border-radius: 10px;
          }
          
          .${scrollbarClass}::-webkit-scrollbar-thumb {
            background: ${isDarkMode ? '#555' : '#c1c1c1'};
            border-radius: 10px;
            border: 2px solid ${isDarkMode ? '#2a2a2a' : '#f1f1f1'};
          }
          
          .${scrollbarClass}::-webkit-scrollbar-thumb:hover {
            background: ${isDarkMode ? '#777' : '#a8a8a8'};
          }
        `}
      </style>
      <div 
        className="fixed inset-0 backdrop-blur-sm transition-all duration-300"
        style={{ 
          backgroundColor: 'rgba(18, 18, 18, 0.85)', 
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={onClose}
      >
        <div 
          className={`w-full max-w-2xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
            isDarkMode ? 'bg-[#1c1c1c]' : 'bg-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`p-6 border-b flex-shrink-0 ${
            isDarkMode ? 'border-gray-700 bg-[#171717]' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className={`w-6 h-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Followers {followers.length > 0 && `(${followers.length})`}
                </h2>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-colors ${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div 
            className={`flex-1 overflow-y-auto p-6 ${scrollbarClass}`}
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: isDarkMode ? '#555 #2a2a2a' : '#c1c1c1 #f1f1f1'
            }}
          >
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center space-y-4">
                  <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                    isDarkMode ? 'border-orange-400' : 'border-orange-600'
                  }`}></div>
                  <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading followers...</div>
                </div>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className={`mb-2 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>Error: {error}</div>
                  <button 
                    onClick={fetchFollowers}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      isDarkMode 
                        ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                    }`}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : followers.length > 0 ? (
              <div className="space-y-3">
                {followers.map((follower) => (
                  <div key={follower._id} className={`rounded-xl p-4 transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-[#262626] hover:bg-[#2a2a2a] border border-gray-700' 
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center space-x-3 cursor-pointer flex-1"
                        onClick={() => handleUserClick(follower._id)}
                      >
                        <img
                          src={getProfilePictureUrl(follower.profile_picture)}
                          alt={follower.username}
                          className="w-12 h-12 rounded-full object-cover border border-gray-300"
                        />
                        <div className="flex-1">
                          <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            @{follower.username}
                          </p>
                          {follower.full_name && (
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {follower.full_name}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Only show follow button if not own profile and not viewing self */}
                      {!isOwnProfile && follower._id !== userId && (
                        <button
                          onClick={() => handleFollowToggle(follower._id)}
                          disabled={actionLoading[follower._id]}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            follower.is_following
                              ? (isDarkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800')
                              : 'bg-orange-600 hover:bg-orange-500 text-white'
                          }`}
                        >
                          {actionLoading[follower._id] ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            follower.is_following ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />
                          )}
                          <span>{follower.is_following ? 'Unfollow' : 'Follow'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className={`mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  </div>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {isOwnProfile ? "You don't have any followers yet." : "No followers yet."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default FollowerModal;