import Header from '../header/Header';
import Sidebar from '../sidebar/Sidebar';
import PostItem from '../posts/PostItem';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

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
    profile_picture: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

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
        url = `${API_BASE_URL}/users/me?include_posts=true&posts_limit=10`;
      } else {
        url = `${API_BASE_URL}/users/profile/${userId}/enhanced?include_posts=true&posts_limit=10`;
      }
      
      console.log('Fetching profile from:', url); // Debug log
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      //console.log('Response status:', response.status); // Debug log
      
      if (!response.ok) {
        const errorData = await response.json();
        //console.error('Error response:', errorData); // Debug log
        throw new Error(errorData.error || 'Failed to fetch profile');
      }
      
      const data = await response.json();
      //console.log('Profile data:', data); // Debug log
      setProfile(data.profile);
      
      // Only set edit form for own profile
      if (isOwnProfile) {
        setEditForm({
          full_name: data.profile.full_name || '',
          bio: data.profile.bio || '',
          website: data.profile.website || '',
          location: data.profile.location || '',
          profile_picture: data.profile.profile_picture || ''
        });
      }
    } catch (err) {
      //console.error('Fetch profile error:', err); // Debug log
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // update profile (only for own profile)
  const updateProfile = async () => {
    if (!isOwnProfile) return;
    
    try {
      // CORRECTED ENDPOINT
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
      setProfile(data.profile);
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
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('profile_picture', file);
      
      // CORRECTED ENDPOINT
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
      setProfile(data.profile);
      setEditForm(prev => ({ ...prev, profile_picture: data.profile.profile_picture }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Update profile picture URL (only for own profile)
  const updateProfilePictureUrl = async (pictureUrl) => {
    if (!isOwnProfile) return;
    
    try {
      // CORRECTED ENDPOINT
      const response = await fetch(`${API_BASE_URL}/users/me/picture`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ profile_picture: pictureUrl }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile picture');
      }
      
      const data = await response.json();
      setProfile(data.profile);
      setEditForm(prev => ({ ...prev, profile_picture: pictureUrl }));
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle file selection (only for own profile)
  const handleFileSelect = (event) => {
    if (!isOwnProfile) return;
    
    const file = event.target.files[0];
    if (file) {
      // type of files that are allows
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }
      
      // make sure each file has a limit in size
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSizeInBytes) {
        setError('File size must be less than 5MB');
        return;
      }
      
      // Clear any previous errors
      setError(null);
      
      // upload the file
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
    // Reset form to original values
    setEditForm({
      full_name: profile.full_name || '',
      bio: profile.bio || '',
      website: profile.website || '',
      location: profile.location || '',
      profile_picture: profile.profile_picture || ''
    });
  };

  const getProfilePictureUrl = () => {
    if (profile.profile_picture && profile.profile_picture.trim() !== '') {
      if (profile.profile_picture.startsWith('http')) {
        return profile.profile_picture;
      }
      return `http://localhost:5000/uploads/profile_pictures/${profile.profile_picture}`;
    }
    // Default profile picture
    return "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ccircle cx='50' cy='35' r='15' fill='%23bdbdbd'/%3E%3Cellipse cx='50' cy='85' rx='25' ry='20' fill='%23bdbdbd'/%3E%3C/svg%3E";
  };

  if (loading) return (
    <div>
      <Header />
      <Sidebar />
      <div>Loading...</div>
    </div>
  );
  
  if (error) return (
    <div>
      <Header />
      <Sidebar />
      <div>
        <p>Error: {error}</p>
        <button onClick={fetchProfile}>Try Again</button>
      </div>
    </div>
  );
  
  if (!profile) return (
    <div>
      <Header />
      <Sidebar />
      <div>Profile not found</div>
    </div>
  );

  return (
    <div>
        <Header />
        <Sidebar />
        <h1>{isOwnProfile ? 'My Profile' : `${profile.username}'s Profile`}</h1>
        
        {/* Profile Picture */}
        <div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img 
                src={getProfilePictureUrl()} 
                alt={profile.username}
                width="100"
                height="100"
                style={{ borderRadius: '50%', objectFit: 'cover' }}
            />
            {uploadingImage && (
              <div>
                Uploading...
              </div>
            )}
          </div>
          
          {/* Only show upload controls for own profile */}
          {isOwnProfile && (
            <>
              {/* File input (hidden) */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              {/* Upload/Edit buttons */}
              <div style={{ marginTop: '10px' }}>
                <button 
                  onClick={openFilePicker}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? 'Uploading...' : 'Upload New Photo'}
                </button>
                
                {isEditing && (
                  <div style={{ marginTop: '10px' }}>
                    <label>Or enter image URL:</label>
                    <input
                      type="url"
                      placeholder="Profile picture URL"
                      value={editForm.profile_picture}
                      onChange={(e) => handleInputChange('profile_picture', e.target.value)}
                    />
                    <button 
                      onClick={() => updateProfilePictureUrl(editForm.profile_picture)}
                    >
                      Update from URL
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Basic Info */}
        <div>
        <h2>@{profile.username}</h2>
        {profile.is_verified && <span>✓ Verified</span>}
        </div>

        {/* Stats */}
        <div>
        <span>{profile.posts_count} posts</span>
        <span>{profile.followers_count} followers</span>
        <span>{profile.following_count} following</span>
        {profile.liked_posts_count !== undefined && (
          <span>{profile.liked_posts_count} liked posts</span>
        )}
        </div>

        {/* Action buttons for other users */}
        {!isOwnProfile && (
          <div>
            <button onClick={handleFollowToggle}>
              {profile.is_following ? 'Unfollow' : 'Follow'}
            </button>
            
            <button 
              onClick={handleMessageUser}
              disabled={messagingUser}
            >
              {messagingUser ? 'Starting chat...' : 'Message'}
            </button>
          </div>
        )}

        {/* Profile Details */}
        {!isEditing ? (
        <div>
            {profile.full_name && <p><strong>Name:</strong> {profile.full_name}</p>}
            {profile.bio && <p><strong>Bio:</strong> {profile.bio}</p>}
            {profile.website && (
            <p>
                <strong>Website:</strong> 
                <a href={profile.website} target="_blank" rel="noopener noreferrer">
                {profile.website}
                </a>
            </p>
            )}
            {profile.location && <p><strong>Location:</strong> {profile.location}</p>}
            {profile.email && isOwnProfile && <p><strong>Email:</strong> {profile.email}</p>}
            
            <p><strong>Joined:</strong> {new Date(profile.created_at).toLocaleDateString()}</p>
            {profile.updated_at && (
            <p><strong>Last updated:</strong> {new Date(profile.updated_at).toLocaleDateString()}</p>
            )}
        </div>
        ) : (
        <div>
            <div>
            <label>Full Name:</label>
            <input
                type="text"
                value={editForm.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                maxLength={100}
            />
            </div>
            
            <div>
            <label>Bio:</label>
            <textarea
                value={editForm.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                maxLength={500}
            />
            </div>
            
            <div>
            <label>Website:</label>
            <input
                type="url"
                value={editForm.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://yourwebsite.com"
            />
            </div>
            
            <div>
            <label>Location:</label>
            <input
                type="text"
                value={editForm.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                maxLength={100}
                placeholder="City, Country"
            />
            </div>
        </div>
        )}

        {/* Action Buttons - Only for own profile */}
        {isOwnProfile && (
          <div>
          {!isEditing ? (
              <button onClick={() => setIsEditing(true)}>
              Edit Profile
              </button>
          ) : (
              <div>
              <button onClick={handleSave}>Save</button>
              <button onClick={handleCancel}>Cancel</button>
              </div>
          )}
          </div>
        )}

        {/* Recent Posts - Using PostItem Component */}
        {profile.recent_posts && profile.recent_posts.length > 0 && (
        <div>
            <h3>Recent Posts ({profile.recent_posts.length})</h3>
            {profile.recent_posts.map((post) => (
                <PostItem key={post._id} post={post} />
            ))}
        </div>
        )}
        
        {/* Show message if no posts */}
        {profile.recent_posts && profile.recent_posts.length === 0 && (
            <div>
                <p>{isOwnProfile ? "You haven't posted anything yet." : `${profile.username} hasn't posted anything yet.`}</p>
            </div>
        )}
    </div>
  );
};

export default Profile;