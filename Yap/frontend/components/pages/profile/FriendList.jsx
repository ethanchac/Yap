import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '../../../services/config';
import { useTheme } from '../../../contexts/ThemeContext'; // Add this import

const FriendList = ({ userId, isOwnProfile }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isDarkMode } = useTheme(); // Add this hook

  // Get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Fetch friends list
  const fetchFriends = async () => {
    try {
      setLoading(true);
      let url;
      
      if (isOwnProfile) {
        url = `${API_BASE_URL}/users/me/friends`;
      } else {
        url = `${API_BASE_URL}/users/${userId}/friends`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch friends');
      }
      
      const data = await response.json();
      setFriends(data.friends || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [userId, isOwnProfile]);

  // Get profile picture URL
  const getProfilePictureUrl = (friend) => {
    if (friend.profile_picture && friend.profile_picture.trim() !== '') {
      if (friend.profile_picture.startsWith('http')) {
        return friend.profile_picture;
      }
      return `${API_BASE_URL}/uploads/profile_pictures/${friend.profile_picture}`;
    }
    // Return default avatar with initials
    const initials = friend.full_name 
      ? friend.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
      : friend.username[0].toUpperCase();
    
    return `data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ctext x='50' y='58' text-anchor='middle' font-size='32' font-family='Arial' fill='%23666'%3E${initials}%3C/text%3E%3C/svg%3E`;
  };

  // Handle friend click (navigate to their profile)
  const handleFriendClick = (friend) => {
    window.location.href = `/profile/${friend._id}`;
  };

  const cardBgColor = isDarkMode ? '#171717' : '#ffffff';
  const skeletonBgColor = isDarkMode ? '#374151' : '#e5e7eb';

  if (loading) {
    return (
      <div 
        className={`rounded-lg p-6 mb-6 ${isDarkMode ? '' : 'border border-gray-200'}`}
        style={{ backgroundColor: cardBgColor }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Friends
          </h3>
        </div>
        <div className="flex space-x-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center animate-pulse">
              <div 
                className="w-16 h-16 rounded-full mb-2"
                style={{ backgroundColor: skeletonBgColor }}
              ></div>
              <div 
                className="w-12 h-3 rounded"
                style={{ backgroundColor: skeletonBgColor }}
              ></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className={`rounded-lg p-6 mb-6 ${isDarkMode ? '' : 'border border-gray-200'}`}
        style={{ backgroundColor: cardBgColor }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Friends
          </h3>
        </div>
        <p className="text-red-400 text-sm">Failed to load friends</p>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div 
        className={`rounded-lg p-6 mb-6 ${isDarkMode ? '' : 'border border-gray-200'}`}
        style={{ backgroundColor: cardBgColor }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Friends
          </h3>
        </div>
        <p className={`text-sm ${
          isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`}>
          {isOwnProfile ? "You don't have any mutual friends yet." : "No mutual friends to show."}
        </p>
      </div>
    );
  }

  return (
    <div 
      className={`rounded-lg p-6 mb-6 ${isDarkMode ? '' : 'border border-gray-200'}`}
      style={{ backgroundColor: cardBgColor }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Friends {friends.length > 0 && (
            <span className={`font-normal ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              ({friends.length})
            </span>
          )}
        </h3>
        {friends.length > 7 && (
          <button className={`flex items-center text-sm font-bold transition-colors ${
            isDarkMode 
              ? 'text-blue-400 hover:text-blue-300' 
              : 'text-blue-600 hover:text-blue-500'
          }`}>
            <span>See all</span>
            <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        )}
      </div>
      
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
        {friends.slice(0, 7).map((friend) => (
          <div 
            key={friend._id}
            onClick={() => handleFriendClick(friend)}
            className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <div className="relative">
              <img 
                src={getProfilePictureUrl(friend)}
                alt={friend.username}
                className={`w-16 h-16 rounded-full object-cover border-2 transition-colors ${
                  isDarkMode 
                    ? 'border-gray-600 hover:border-gray-500' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              />
              {friend.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <span className={`text-sm font-medium mt-2 text-center max-w-[70px] truncate ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {friend.username}
            </span>
          </div>
        ))}
        
        {friends.length > 7 && (
          <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
            <div className={`w-16 h-16 rounded-full transition-colors flex items-center justify-center border-2 ${
              isDarkMode 
                ? 'bg-gray-600 hover:bg-gray-500 border-gray-600' 
                : 'bg-gray-200 hover:bg-gray-300 border-gray-300'
            }`}>
              <span className={`text-xs font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                +{friends.length - 7}
              </span>
            </div>
            <span className={`text-sm font-medium mt-2 text-center ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              More
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendList;