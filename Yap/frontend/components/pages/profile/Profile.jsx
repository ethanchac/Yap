import Header from '../../header/Header';
import Sidebar from '../../sidebar/Sidebar';
import PostItem from '../../posts/PostItem';
import Program from './Program';
import FriendList from './FriendList'; // Add this import
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, MapPin, Globe, Calendar, Check, MessageCircle, UserPlus, UserMinus, Edit3, GraduationCap } from 'lucide-react';

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
  const fileInputRef = useRef(null);
  const mainContentRef = useRef(null);

  const API_BASE_URL = 'http://localhost:5000';
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

  const getProfilePictureUrl = () => {
    if (profile.profile_picture && profile.profile_picture.trim() !== '') {
      if (profile.profile_picture.startsWith('http')) {
        return profile.profile_picture;
      }
      return `http://localhost:5000/uploads/profile_pictures/${profile.profile_picture}`;
    }
    return "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ccircle cx='50' cy='35' r='15' fill='%23bdbdbd'/%3E%3Cellipse cx='50' cy='85' rx='25' ry='20' fill='%23bdbdbd'/%3E%3C/svg%3E";
  };

  if (loading) return (
    <div className="h-screen overflow-hidden font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
      <Header />
      <Sidebar />
      <div className="ml-64 h-full overflow-y-auto p-6">
        <p className="text-white">Loading...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="h-screen overflow-hidden font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
      <Header />
      <Sidebar />
      <div className="ml-64 h-full overflow-y-auto p-6">
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button 
            onClick={fetchProfile}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
  
  if (!profile) return (
    <div className="h-screen overflow-hidden font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
      <Header />
      <Sidebar />
      <div className="ml-64 h-full overflow-y-auto p-6">
        <p className="text-white">Profile not found</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
      <Header />
      <Sidebar />
      <div 
        ref={mainContentRef}
        className="ml-64 h-full overflow-y-auto p-6"
      >
        <div className="max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="rounded-lg p-6 mb-6" style={{backgroundColor: '#171717'}}>
            <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-6">
              {/* Profile Picture */}
              <div className="relative">
                <img 
                  src={getProfilePictureUrl()} 
                  alt={profile.username}
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-600"
                />
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">Uploading...</span>
                  </div>
                )}
                
                {/* Upload button for own profile */}
                {isOwnProfile && (
                  <button
                    onClick={openFilePicker}
                    disabled={uploadingImage}
                    className="absolute bottom-2 right-2 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded-full transition-colors"
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
                    <h1 className="text-white text-2xl font-bold flex items-center space-x-2">
                      <span>@{profile.username}</span>
                      {profile.is_verified && <Check className="w-5 h-5 text-blue-400" />}
                    </h1>
                    {profile.full_name && (
                      <p className="text-gray-300 text-lg">{profile.full_name}</p>
                    )}
                    {/* Always show email if available */}
                    {profile.email && (
                      <p className="text-gray-400 text-sm">{profile.email}</p>
                    )}
                  </div>

                  {/* Action buttons for other users */}
                  {!isOwnProfile && (
                    <div className="flex space-x-3 mt-4 md:mt-0">
                      <button 
                        onClick={handleFollowToggle}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-colors ${
                          profile.is_following 
                            ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        {profile.is_following ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        <span>{profile.is_following ? 'Unfollow' : 'Follow'}</span>
                      </button>
                      
                      <button 
                        onClick={handleMessageUser}
                        disabled={messagingUser}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
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
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold transition-colors mt-4 md:mt-0"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </button>
                  )}
                </div>

                {/* Stats */}
                <div className="flex space-x-6 mb-4">
                  <span className="text-white"><strong>{profile.posts_count || 0}</strong> <span className="text-gray-400">posts</span></span>
                  <span className="text-white"><strong>{profile.followers_count || 0}</strong> <span className="text-gray-400">followers</span></span>
                  <span className="text-white"><strong>{profile.following_count || 0}</strong> <span className="text-gray-400">following</span></span>
                  {profile.liked_posts_count !== undefined && (
                    <span className="text-white"><strong>{profile.liked_posts_count}</strong> <span className="text-gray-400">likes</span></span>
                  )}
                </div>

                {/* Profile Details */}
                {!isEditing ? (
                  <div className="space-y-2">
                    {profile.bio && <p className="text-white">{profile.bio}</p>}
                    
                    <div className="flex flex-wrap gap-4 text-gray-400 text-sm">
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
                      <label className="block text-white text-sm mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editForm.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        maxLength={100}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gray-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-white text-sm mb-1">Bio</label>
                      <textarea
                        value={editForm.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        maxLength={500}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gray-400 h-20 resize-none"
                      />
                    </div>

                    {/* Program Selection */}
                    <Program 
                      value={editForm.program}
                      onChange={(value) => handleInputChange('program', value)}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white text-sm mb-1">Website</label>
                        <input
                          type="url"
                          value={editForm.website}
                          onChange={(e) => handleInputChange('website', e.target.value)}
                          placeholder="https://yourwebsite.com"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gray-400"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white text-sm mb-1">Location</label>
                        <input
                          type="text"
                          value={editForm.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          maxLength={100}
                          placeholder="City, Country"
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gray-400"
                        />
                      </div>
                    </div>

                    {/* Save/Cancel buttons */}
                    <div className="flex space-x-3 pt-4">
                      <button 
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
                      >
                        Save Changes
                      </button>
                      <button 
                        onClick={handleCancel}
                        className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FriendList Component - Added here between profile header and recent posts */}
          <FriendList userId={userId} isOwnProfile={isOwnProfile} />

          {/* Recent Posts */}
          {profile.recent_posts && profile.recent_posts.length > 0 && (
            <div>
              <h3 className="text-white text-xl font-bold mb-4">
                Recent Posts ({profile.recent_posts.length})
              </h3>
              <div className="space-y-4">
                {profile.recent_posts.map((post) => (
                  <PostItem key={post._id} post={post} />
                ))}
              </div>
            </div>
          )}
          
          {/* No posts message */}
          {(!profile.recent_posts || profile.recent_posts.length === 0) && (
            <div className="text-center py-12">
              <div className="rounded-lg p-8" style={{backgroundColor: '#171717'}}>
                <p className="text-gray-400">
                  {isOwnProfile ? "You haven't posted anything yet." : `${profile.username} hasn't posted anything yet.`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;