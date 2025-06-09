import Header from '../header/Header';
import Sidebar from '../sidebar/Sidebar';
import React, { useState, useEffect } from 'react';

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

  const API_BASE_URL = 'http://localhost:5000';

  // Get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
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

  // Update profile picture
  const updateProfilePicture = async (pictureUrl) => {
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
        <img 
            src={profile.profile_picture || '/default-avatar.png'} 
            alt={profile.username}
            width="100"
            height="100"
        />
        {isEditing && (
            <div>
            <input
                type="url"
                placeholder="Profile picture URL"
                value={editForm.profile_picture}
                onChange={(e) => handleInputChange('profile_picture', e.target.value)}
            />
            </div>
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