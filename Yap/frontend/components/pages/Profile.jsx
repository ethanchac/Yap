import Header from '../header/Header';
import Sidebar from '../sidebar/Sidebar';
import { useState, useEffect, useRef } from 'react';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
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

  // Get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Get auth headers for file upload (without Content-Type)
  const getFileUploadHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Fetch my profile
  const fetchMyProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/profile/me?include_posts=true&posts_limit=6`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const data = await response.json();
      setProfile(data.profile);
      setEditForm({
        full_name: data.profile.full_name || '',
        bio: data.profile.bio || '',
        website: data.profile.website || '',
        location: data.profile.location || '',
        profile_picture: data.profile.profile_picture || ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update profile
  const updateProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile/me`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(editForm),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      const data = await response.json();
      setProfile(data.profile);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  // Upload profile picture file
  const uploadProfilePicture = async (file) => {
    try {
      setUploadingImage(true);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('profile_picture', file);
      
      const response = await fetch(`${API_BASE_URL}/profile/me/picture/upload`, {
        method: 'POST',
        headers: getFileUploadHeaders(),
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
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

  // Update profile picture URL
  const updateProfilePictureUrl = async (pictureUrl) => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile/me/picture`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ profile_picture: pictureUrl }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile picture');
      }
      
      const data = await response.json();
      setProfile(data.profile);
      setEditForm(prev => ({ ...prev, profile_picture: pictureUrl }));
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }
      
      // Validate file size (e.g., 5MB limit)
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSizeInBytes) {
        setError('File size must be less than 5MB');
        return;
      }
      
      // Clear any previous errors
      setError(null);
      
      // Upload the file
      uploadProfilePicture(file);
    }
  };

  // Open file picker
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    fetchMyProfile();
  }, []);

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

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!profile) return <div>Profile not found</div>;

  return (
    <div>
        <Header />
        <Sidebar />
        <h1>My Profile</h1>
        
        {/* Profile Picture */}
        <div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img 
                src={profile.profile_picture || '/default-avatar.png'} 
                alt={profile.username}
                width="100"
                height="100"
                style={{ borderRadius: '50%', objectFit: 'cover' }}
            />
            {uploadingImage && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                Uploading...
              </div>
            )}
          </div>
          
          {/* File input (hidden) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
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
        </div>

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
            {profile.email && <p><strong>Email:</strong> {profile.email}</p>}
            
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

        {/* Action Buttons */}
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

        {/* Recent Posts */}
        {profile.recent_posts && profile.recent_posts.length > 0 && (
        <div>
            <h3>Recent Posts</h3>
            {profile.recent_posts.map((post) => (
            <div key={post._id}>
                <p>{post.content}</p>
                <div>
                <span>{post.likes_count} likes</span>
                <span>{post.comments_count} comments</span>
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
            </div>
            ))}
        </div>
        )}
    </div>
  );
};

export default Profile;