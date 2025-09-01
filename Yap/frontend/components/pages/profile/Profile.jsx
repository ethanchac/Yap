import Header from '../../header/Header';
import Sidebar from '../../sidebar/Sidebar';
import PostItem from '../home/posts/PostItem';
import Program from './Program';
import FriendList from './FriendList'; // Add this import
import ProfileEvents from './ProfileEvents'; // Add this import
import FollowerModal from './FollowerModal';
import FollowingModal from './FollowingModal';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, MapPin, Globe, Calendar, Check, MessageCircle, UserPlus, UserMinus, Edit3, GraduationCap, Heart } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { API_BASE_URL } from '../../../services/config';
import { getProfilePictureUrl, getDefaultProfilePicture } from '../../../utils/profileUtils';

const Profile = () => {
  const { userId } = useParams(); // Get userId from URL
  const navigate = useNavigate(); // For navigation
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [messagingUser, setMessagingUser] = useState(false); // Loading state for message button
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    website: '',
    location: '',
    program: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isFollowerModalOpen, setIsFollowerModalOpen] = useState(false);
  const [isFollowingModalOpen, setIsFollowingModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const mainContentRef = useRef(null);
  const { isDarkMode } = useTheme();

  const isOwnProfile = !userId; // if no userId in URL, it's own profile

  // get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // get auth headers for file upload (without Content-Type)
  const getFileUploadHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Handle navigate to liked posts
  const handleViewLikedPosts = () => {
    navigate('/likes?from=profile');
  };

  // Handle message button click
  const handleMessageUser = async () => {
    if (isOwnProfile) return; // Can't message yourself
    
    try {
      setMessagingUser(true);
      
      const response = await fetch(`${API_BASE_URL}/users/${userId}/start-conversation`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start conversation');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Redirect to messages page with the conversation ID
        navigate(`/messages?conversation=${data.conversation_id}`);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setMessagingUser(false);
    }
  };

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    if (isOwnProfile) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update follow status');
      }
      
      const data = await response.json();
      
      // Update profile state with new follow status
      setProfile(prev => ({
        ...prev,
        is_following: data.following,
        followers_count: data.following 
          ? prev.followers_count + 1 
          : prev.followers_count - 1
      }));
      
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch profile (own or other user's)
  const fetchProfile = async () => {
    try {
      setLoading(true);
      let url;
      
      if (isOwnProfile) {
        // Use the enhanced endpoint for own profile too to get posts
        url = `${API_BASE_URL}/users/me/enhanced?include_posts=true&posts_limit=10`;
      } else {
        url = `${API_BASE_URL}/users/profile/${userId}/enhanced?include_posts=true&posts_limit=10`;
      }
      
      console.log('Fetching profile from:', url); // Debug log
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        // If enhanced endpoint doesn't exist for own profile, fallback to regular endpoint
        if (isOwnProfile && response.status === 404) {
          console.log('Enhanced endpoint not found, trying regular endpoint with posts');
          const fallbackResponse = await fetch(`${API_BASE_URL}/users/me?include_posts=true&posts_limit=10`, {
            method: 'GET',
            headers: getAuthHeaders(),
          });
          
          if (!fallbackResponse.ok) {
            const errorData = await fallbackResponse.json();
            throw new Error(errorData.error || 'Failed to fetch profile');
          }
          
          const fallbackData = await fallbackResponse.json();
          setProfile(fallbackData.profile || fallbackData);
          
          // Set edit form for own profile
          const profileData = fallbackData.profile || fallbackData;
          setEditForm({
            full_name: profileData.full_name || '',
            bio: profileData.bio || '',
            website: profileData.website || '',
            location: profileData.location || '',
            program: profileData.program || ''
          });
          return;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch profile');
      }
      
      const data = await response.json();
      setProfile(data.profile || data);
      
      // Only set edit form for own profile
      if (isOwnProfile) {
        const profileData = data.profile || data;
        setEditForm({
          full_name: profileData.full_name || '',
          bio: profileData.bio || '',
          website: profileData.website || '',
          location: profileData.location || '',
          program: profileData.program || ''
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // update profile (only for own profile)
  const updateProfile = async () => {
    if (!isOwnProfile) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editForm),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      const data = await response.json();
      setProfile(prev => ({
        ...prev,
        ...data.profile
      }));
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  // upload profile picture file (only for own profile)
  const uploadProfilePicture = async (file) => {
    if (!isOwnProfile) return;
    
    try {
      setUploadingImage(true);
      
      const formData = new FormData();
      formData.append('profile_picture', file);
      
      const response = await fetch(`${API_BASE_URL}/users/me/picture/upload`, {
        method: 'POST',
        headers: getFileUploadHeaders(),
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload profile picture');
      }
      
      const data = await response.json();
      setProfile(prev => ({
        ...prev,
        ...data.profile
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle file selection (only for own profile)
  const handleFileSelect = (event) => {
    if (!isOwnProfile) return;
    
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }
      
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSizeInBytes) {
        setError('File size must be less than 5MB');
        return;
      }
      
      setError(null);
      uploadProfilePicture(file);
    }
  };

  // Open file picker (only for own profile)
  const openFilePicker = () => {
    if (!isOwnProfile) return;
    fileInputRef.current?.click();
  };

  // Re-fetch when userId changes
  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateProfile();
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm({
      full_name: profile.full_name || '',
      bio: profile.bio || '',
      website: profile.website || '',
      location: profile.location || '',
      program: profile.program || ''
    });
  };

  // Use the centralized profile picture utility

  // Dynamic colors based on theme
  const headerBgColor = isDarkMode ? '#171717' : '#f8f9fa';
  const cardBgColor = isDarkMode ? '#171717' : '#ffffff';
  const inputBgColor = isDarkMode ? '#374151' : '#f9fafb';

  if (loading) return (
    <div className="h-screen overflow-hidden font-bold" style={{
      backgroundColor: isDarkMode ? '#121212' : '#ffffff', 
      fontFamily: 'Albert Sans'
    }}>
      <Header />
      <Sidebar />
      <div className="ml-64 h-full overflow-y-auto p-6">
        <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>Loading...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="h-screen overflow-hidden font-bold" style={{
      backgroundColor: isDarkMode ? '#121212' : '#ffffff', 
      fontFamily: 'Albert Sans'
    }}>
      <Header />
      <Sidebar />
      <div className="ml-64 h-full overflow-y-auto p-6">
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button 
            onClick={fetchProfile}
            className={`px-4 py-2 rounded-lg font-bold transition-colors ${
              isDarkMode
                ? 'bg-orange-600 hover:bg-orange-500 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
  
  if (!profile) return (
    <div className="h-screen overflow-hidden font-bold" style={{
      backgroundColor: isDarkMode ? '#121212' : '#ffffff', 
      fontFamily: 'Albert Sans'
    }}>
      <Header />
      <Sidebar />
      <div className="ml-64 h-full overflow-y-auto p-6">
        <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>Profile not found</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden font-bold" style={{
      backgroundColor: isDarkMode ? '#121212' : '#ffffff', 
      fontFamily: 'Albert Sans'
    }}>
      <Header />
      <Sidebar />
      <div 
        ref={mainContentRef}
        className="ml-64 h-full overflow-y-auto p-6"
      >
        <div className="max-w-7xl mx-auto">
          {/* Profile Header */}
          <div 
            className={`rounded-lg p-6 mb-6 ${isDarkMode ? '' : 'border border-gray-200'}`}
            style={{ backgroundColor: headerBgColor }}
          >
            <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-6">
              {/* Profile Picture */}
              <div className="relative">
                <img 
                  src={getProfilePictureUrl(profile.profile_picture)} 
                  alt={profile.username}
                  className={`w-32 h-32 rounded-full object-cover border-4 ${
                    isDarkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}
                  onError={(e) => {
                    e.target.src = getDefaultProfilePicture();
                  }}
                />
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">Uploading...</span>
                  </div>
                )}
                
                {/* Upload button for own profile - CHANGED TO ORANGE */}
                {isOwnProfile && (
                  <button
                    onClick={openFilePicker}
                    disabled={uploadingImage}
                    className={`absolute bottom-2 right-2 p-2 text-white rounded-full transition-colors ${
                      isDarkMode
                        ? 'bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600'
                        : 'bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                  <div>
                    <h1 className={`text-2xl font-bold flex items-center space-x-2 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      <span>@{profile.username}</span>
                      {profile.is_verified && <Check className="w-5 h-5 text-blue-400" />}
                    </h1>
                    {profile.full_name && (
                      <p className={`text-lg ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {profile.full_name}
                      </p>
                    )}
                    {/* Always show email if available */}
                    {profile.email && (
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {profile.email}
                      </p>
                    )}
                  </div>

                  {/* Action buttons for other users */}
                  {!isOwnProfile && (
                    <div className="flex space-x-3 mt-4 md:mt-0">
                      <button 
                        onClick={handleFollowToggle}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-colors ${
                          profile.is_following 
                            ? (isDarkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800')
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        {profile.is_following ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        <span>{profile.is_following ? 'Unfollow' : 'Follow'}</span>
                      </button>
                      
                      <button 
                        onClick={handleMessageUser}
                        disabled={messagingUser}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-colors ${
                          isDarkMode
                            ? 'bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:opacity-50 text-white'
                            : 'bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:opacity-50 text-gray-800'
                        }`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{messagingUser ? 'Starting chat...' : 'Message'}</span>
                      </button>
                    </div>
                  )}

                  {/* Edit button for own profile */}
                  {isOwnProfile && !isEditing && (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-colors mt-4 md:mt-0 ${
                        isDarkMode
                          ? 'bg-gray-600 hover:bg-gray-500 text-white'
                          : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                      }`}
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </button>
                  )}
                </div>

                {/* Stats */}
                <div className="flex space-x-6 mb-4">
                  <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                    <strong>{profile.posts_count || 0}</strong> 
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}> posts</span>
                  </span>
                  <button 
                    onClick={() => setIsFollowerModalOpen(true)}
                    className={`hover:opacity-80 transition-opacity ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                  >
                    <strong>{profile.followers_count || 0}</strong> 
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}> followers</span>
                  </button>
                  <button 
                    onClick={() => setIsFollowingModalOpen(true)}
                    className={`hover:opacity-80 transition-opacity ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                  >
                    <strong>{profile.following_count || 0}</strong> 
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}> following</span>
                  </button>
                  {profile.liked_posts_count !== undefined && (
                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                      <strong>{profile.liked_posts_count}</strong> 
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}> likes</span>
                    </span>
                  )}
                </div>

                {/* Profile Details */}
                {!isEditing ? (
                  <div className="space-y-2">
                    {profile.bio && (
                      <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                        {profile.bio}
                      </p>
                    )}
                    
                    <div className={`flex flex-wrap gap-4 text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {profile.program && (
                        <div className="flex items-center space-x-1">
                          <GraduationCap className="w-4 h-4" />
                          <span>{profile.program}</span>
                        </div>
                      )}
                      {profile.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{profile.location}</span>
                        </div>
                      )}
                      {profile.website && (
                        <div className="flex items-center space-x-1">
                          <Globe className="w-4 h-4" />
                          <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                            {profile.website}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm mb-1 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        maxLength={100}
                        className={`w-full px-3 py-2 border rounded focus:outline-none ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-gray-500'
                        }`}
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm mb-1 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        Bio
                      </label>
                      <textarea
                        value={editForm.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        maxLength={500}
                        className={`w-full px-3 py-2 border rounded h-20 resize-none focus:outline-none ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-gray-400'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-gray-500'
                        }`}
                      />
                    </div>

                    {/* Program Selection */}
                    <Program 
                      value={editForm.program}
                      onChange={(value) => handleInputChange('program', value)}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm mb-1 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          Website
                        </label>
                        <input
                          type="url"
                          value={editForm.website}
                          onChange={(e) => handleInputChange('website', e.target.value)}
                          placeholder="https://yourwebsite.com"
                          className={`w-full px-3 py-2 border rounded focus:outline-none ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 focus:border-gray-500'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm mb-1 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          Location
                        </label>
                        <input
                          type="text"
                          value={editForm.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          maxLength={100}
                          placeholder="City, Country"
                          className={`w-full px-3 py-2 border rounded focus:outline-none ${
                            isDarkMode
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-gray-400'
                              : 'bg-white border-gray-300 text-gray-900 focus:border-gray-500'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Save/Cancel buttons - SAVE BUTTON CHANGED TO ORANGE */}
                    <div className="flex space-x-3 pt-4">
                      <button 
                        onClick={handleSave}
                        className={`px-6 py-2 rounded-lg font-bold transition-colors ${
                          isDarkMode
                            ? 'bg-orange-600 hover:bg-orange-500 text-white'
                            : 'bg-orange-500 hover:bg-orange-600 text-white'
                        }`}
                      >
                        Save Changes
                      </button>
                      <button 
                        onClick={handleCancel}
                        className={`px-6 py-2 rounded-lg font-bold transition-colors ${
                          isDarkMode
                            ? 'bg-gray-600 hover:bg-gray-500 text-white'
                            : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FriendList Component - Only show for own profile */}
          {isOwnProfile && <FriendList userId={userId} isOwnProfile={isOwnProfile} />}

          {/* Main Content Layout - Posts and Events Side by Side */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Posts Section - 60% width on large screens */}
            <div className="flex-1 lg:w-3/5">
              {/* Posts Section Header with Liked Posts Button */}
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Recent Posts {profile.recent_posts && profile.recent_posts.length > 0 && `(${profile.recent_posts.length})`}
                </h3>
                
                {/* Liked Posts Button - Only show for own profile */}
                {isOwnProfile && (
                  <button 
                    onClick={handleViewLikedPosts}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                    <span>Liked Posts</span>
                  </button>
                )}
              </div>

              {/* Recent Posts */}
              {profile.recent_posts && profile.recent_posts.length > 0 && (
                <div className="space-y-4">
                  {profile.recent_posts.map((post) => (
                    <PostItem key={post._id} post={post} />
                  ))}
                </div>
              )}
              
              {/* No posts message */}
              {(!profile.recent_posts || profile.recent_posts.length === 0) && (
                <div className="text-center py-12">
                  <div 
                    className={`rounded-lg p-8 ${isDarkMode ? '' : 'border border-gray-200'}`}
                    style={{ backgroundColor: cardBgColor }}
                  >
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                      {isOwnProfile ? "You haven't posted anything yet." : `${profile.username} hasn't posted anything yet.`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Events Section - 40% width on large screens */}
            <div className="lg:w-2/5">
              <ProfileEvents userId={userId} isOwnProfile={isOwnProfile} />
            </div>
          </div>
        </div>
      </div>

      {/* Follower Modal */}
      {isFollowerModalOpen && (
        <div 
          className="fixed inset-0 backdrop-blur-sm transition-all duration-300"
          style={{ 
            backgroundColor: isDarkMode 
              ? 'rgba(18, 18, 18, 0.85)' 
              : 'rgba(0, 0, 0, 0.5)', 
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setIsFollowerModalOpen(false)}
        >
          <FollowerModal
            isOpen={isFollowerModalOpen}
            onClose={() => setIsFollowerModalOpen(false)}
            userId={userId}
            isOwnProfile={isOwnProfile}
          />
        </div>
      )}

      {/* Following Modal */}
      {isFollowingModalOpen && (
        <div 
          className="fixed inset-0 backdrop-blur-sm transition-all duration-300"
          style={{ 
            backgroundColor: isDarkMode 
              ? 'rgba(18, 18, 18, 0.85)' 
              : 'rgba(0, 0, 0, 0.5)', 
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setIsFollowingModalOpen(false)}
        >
          <FollowingModal
            isOpen={isFollowingModalOpen}
            onClose={() => setIsFollowingModalOpen(false)}
            userId={userId}
            isOwnProfile={isOwnProfile}
          />
        </div>
      )}
    </div>
  );
};

export default Profile;