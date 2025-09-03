import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  TextInput 
} from 'react-native';
import { 
  Camera, 
  MapPin, 
  Globe, 
  Calendar, 
  Check, 
  MessageCircle, 
  UserPlus, 
  UserMinus, 
  Edit3, 
  GraduationCap,
  Heart 
} from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import PostItem from '../posts/PostItem';
import FriendList from './FriendList';
import ProfileEvents from './ProfileEvents';
import Program from './Program';
import { API_BASE_URL } from '../../src/config/api';

function Profile({ userId = null }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    website: '',
    location: '',
    program: ''
  });

  const isOwnProfile = !userId; // if no userId provided, it's own profile

  // Get auth headers (matching PostItem pattern)
  const getAuthHeaders = async () => {
    const token = await SecureStore.getItemAsync('token');
    return {
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Fetch profile data
  const fetchProfile = async () => {
    try {
      setLoading(true);
      let url;
      
      if (isOwnProfile) {
        url = `${API_BASE_URL}/users/me/enhanced?include_posts=true&posts_limit=10`;
      } else {
        url = `${API_BASE_URL}/users/profile/${userId}/enhanced?include_posts=true&posts_limit=10`;
      }
      
      console.log('🔍 Fetching profile from:', url);
      
      const headers = await getAuthHeaders();
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        // Fallback for own profile if enhanced endpoint doesn't exist
        if (isOwnProfile && response.status === 404) {
          console.log('🔄 Enhanced endpoint not found, trying regular endpoint');
          const fallbackResponse = await fetch(`${API_BASE_URL}/users/me?include_posts=true&posts_limit=10`, {
            method: 'GET',
            headers
          });
          
          if (!fallbackResponse.ok) {
            const errorData = await fallbackResponse.json();
            throw new Error(errorData.error || 'Failed to fetch profile');
          }
          
          const fallbackData = await fallbackResponse.json();
          const profileData = fallbackData.profile || fallbackData;
          setProfile(profileData);
          
          // Set edit form for own profile
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
      const profileData = data.profile || data;
      setProfile(profileData);
      
      // Only set edit form for own profile
      if (isOwnProfile) {
        setEditForm({
          full_name: profileData.full_name || '',
          bio: profileData.bio || '',
          website: profileData.website || '',
          location: profileData.location || '',
          program: profileData.program || ''
        });
      }
    } catch (err) {
      console.error('❌ Error fetching profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    if (isOwnProfile) return;
    
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
        method: 'POST',
        headers
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
      console.error('❌ Follow toggle error:', err);
      Alert.alert('Error', err.message);
    }
  };

  // Update profile (only for own profile)
  const updateProfile = async () => {
    if (!isOwnProfile) return;
    
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
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
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err) {
      console.error('❌ Update profile error:', err);
      Alert.alert('Error', err.message);
    }
  };

  // Format date helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Get profile picture URL
  const getProfilePictureUrl = (profilePicture) => {
    if (!profilePicture) return null;
    return profilePicture.startsWith('http') ? profilePicture : `${API_BASE_URL}${profilePicture}`;
  };

  const getDefaultProfilePicture = () => {
    return `${API_BASE_URL}/uploads/profile_pictures/default-avatar.png`;
  };

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

  if (loading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212'
      }}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={{
          marginTop: 16,
          color: '#9ca3af',
          fontFamily: 'System'
        }}>
          Loading profile...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212',
        padding: 20
      }}>
        <Text style={{
          color: '#fca5a5',
          marginBottom: 16,
          textAlign: 'center',
          fontFamily: 'System'
        }}>
          Error: {error}
        </Text>
        <TouchableOpacity
          onPress={fetchProfile}
          style={{
            backgroundColor: '#f97316',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8
          }}
        >
          <Text style={{
            color: 'white',
            fontWeight: 'bold',
            fontFamily: 'System'
          }}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#121212'
      }}>
        <Text style={{
          color: '#9ca3af',
          fontFamily: 'System'
        }}>
          Profile not found
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Profile Header */}
        <View style={{
          backgroundColor: '#171717',
          borderRadius: 8,
          padding: 24,
          marginBottom: 16
        }}>
          {/* Profile Picture and Basic Info */}
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            {/* Profile Picture */}
            <View style={{ position: 'relative', marginBottom: 16 }}>
              <Image
                source={{
                  uri: getProfilePictureUrl(profile.profile_picture) || getDefaultProfilePicture()
                }}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  borderWidth: 3,
                  borderColor: '#374151'
                }}
                onError={() => console.log('Profile image failed to load')}
              />
              
              {/* Upload button for own profile */}
              {isOwnProfile && (
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    bottom: 5,
                    right: 5,
                    backgroundColor: '#f97316',
                    borderRadius: 20,
                    padding: 8,
                    shadowColor: '#f97316',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4
                  }}
                >
                  <Camera size={16} color="white" />
                </TouchableOpacity>
              )}
            </View>

            {/* Username and Full Name */}
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{
                  fontSize: 24,
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontFamily: 'System'
                }}>
                  @{profile.username}
                </Text>
                {profile.is_verified && (
                  <Check size={20} color="#60a5fa" />
                )}
              </View>
              
              {profile.full_name && (
                <Text style={{
                  fontSize: 16,
                  color: '#d1d5db',
                  fontFamily: 'System'
                }}>
                  {profile.full_name}
                </Text>
              )}
              
              {profile.email && (
                <Text style={{
                  fontSize: 14,
                  color: '#9ca3af',
                  fontFamily: 'System'
                }}>
                  {profile.email}
                </Text>
              )}
            </View>

            {/* Stats */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              width: '100%',
              marginBottom: 20
            }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontFamily: 'System'
                }}>
                  {profile.posts_count || 0}
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  fontFamily: 'System'
                }}>
                  posts
                </Text>
              </View>
              
              <TouchableOpacity style={{ alignItems: 'center' }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontFamily: 'System'
                }}>
                  {profile.followers_count || 0}
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  fontFamily: 'System'
                }}>
                  followers
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={{ alignItems: 'center' }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontFamily: 'System'
                }}>
                  {profile.following_count || 0}
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  fontFamily: 'System'
                }}>
                  following
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            {!isOwnProfile ? (
              // Other user's profile - Follow/Message buttons
              <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                <TouchableOpacity
                  onPress={handleFollowToggle}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 12,
                    borderRadius: 8,
                    backgroundColor: profile.is_following ? '#374151' : '#3b82f6'
                  }}
                >
                  {profile.is_following ? (
                    <UserMinus size={16} color="white" />
                  ) : (
                    <UserPlus size={16} color="white" />
                  )}
                  <Text style={{
                    color: 'white',
                    fontWeight: 'bold',
                    fontFamily: 'System'
                  }}>
                    {profile.is_following ? 'Unfollow' : 'Follow'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 12,
                    borderRadius: 8,
                    backgroundColor: '#374151'
                  }}
                >
                  <MessageCircle size={16} color="white" />
                  <Text style={{
                    color: 'white',
                    fontWeight: 'bold',
                    fontFamily: 'System'
                  }}>
                    Message
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Own profile - Edit button
              !isEditing && (
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    backgroundColor: '#374151',
                    width: '100%'
                  }}
                >
                  <Edit3 size={16} color="white" />
                  <Text style={{
                    color: 'white',
                    fontWeight: 'bold',
                    fontFamily: 'System'
                  }}>
                    Edit Profile
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Profile Details */}
          {!isEditing ? (
            <View style={{ gap: 12 }}>
              {profile.bio && (
                <Text style={{
                  color: '#ffffff',
                  fontSize: 16,
                  lineHeight: 22,
                  fontFamily: 'System'
                }}>
                  {profile.bio}
                </Text>
              )}
              
              <View style={{ gap: 8 }}>
                {profile.program && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <GraduationCap size={16} color="#9ca3af" />
                    <Text style={{
                      color: '#9ca3af',
                      fontSize: 14,
                      fontFamily: 'System'
                    }}>
                      {profile.program}
                    </Text>
                  </View>
                )}
                
                {profile.location && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MapPin size={16} color="#9ca3af" />
                    <Text style={{
                      color: '#9ca3af',
                      fontSize: 14,
                      fontFamily: 'System'
                    }}>
                      {profile.location}
                    </Text>
                  </View>
                )}
                
                {profile.website && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Globe size={16} color="#9ca3af" />
                    <Text style={{
                      color: '#60a5fa',
                      fontSize: 14,
                      fontFamily: 'System'
                    }}>
                      {profile.website}
                    </Text>
                  </View>
                )}
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Calendar size={16} color="#9ca3af" />
                  <Text style={{
                    color: '#9ca3af',
                    fontSize: 14,
                    fontFamily: 'System'
                  }}>
                    Joined {formatDate(profile.created_at)}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            // Edit Profile Form
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{
                  color: '#ffffff',
                  fontSize: 14,
                  marginBottom: 8,
                  fontFamily: 'System'
                }}>
                  Full Name
                </Text>
                <TextInput
                  value={editForm.full_name}
                  onChangeText={(value) => handleInputChange('full_name', value)}
                  maxLength={100}
                  style={{
                    backgroundColor: '#374151',
                    borderWidth: 1,
                    borderColor: '#6b7280',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: '#ffffff',
                    fontFamily: 'System'
                  }}
                />
              </View>
              
              <View>
                <Text style={{
                  color: '#ffffff',
                  fontSize: 14,
                  marginBottom: 8,
                  fontFamily: 'System'
                }}>
                  Bio
                </Text>
                <TextInput
                  value={editForm.bio}
                  onChangeText={(value) => handleInputChange('bio', value)}
                  maxLength={500}
                  multiline
                  numberOfLines={3}
                  style={{
                    backgroundColor: '#374151',
                    borderWidth: 1,
                    borderColor: '#6b7280',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: '#ffffff',
                    minHeight: 80,
                    textAlignVertical: 'top',
                    fontFamily: 'System'
                  }}
                />
              </View>
              
              <View>
                <Text style={{
                  color: '#ffffff',
                  fontSize: 14,
                  marginBottom: 8,
                  fontFamily: 'System'
                }}>
                  Website
                </Text>
                <TextInput
                  value={editForm.website}
                  onChangeText={(value) => handleInputChange('website', value)}
                  placeholder="https://yourwebsite.com"
                  placeholderTextColor="#6b7280"
                  style={{
                    backgroundColor: '#374151',
                    borderWidth: 1,
                    borderColor: '#6b7280',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: '#ffffff',
                    fontFamily: 'System'
                  }}
                />
              </View>
              
              <View>
                <Text style={{
                  color: '#ffffff',
                  fontSize: 14,
                  marginBottom: 8,
                  fontFamily: 'System'
                }}>
                  Location
                </Text>
                <TextInput
                  value={editForm.location}
                  onChangeText={(value) => handleInputChange('location', value)}
                  maxLength={100}
                  placeholder="City, Country"
                  placeholderTextColor="#6b7280"
                  style={{
                    backgroundColor: '#374151',
                    borderWidth: 1,
                    borderColor: '#6b7280',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    color: '#ffffff',
                    fontFamily: 'System'
                  }}
                />
              </View>

              {/* Program Selection */}
              <Program 
                value={editForm.program}
                onChange={(value) => handleInputChange('program', value)}
              />
              
              {/* Save/Cancel buttons */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={handleSave}
                  style={{
                    flex: 1,
                    backgroundColor: '#f97316',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{
                    color: 'white',
                    fontWeight: 'bold',
                    fontFamily: 'System'
                  }}>
                    Save Changes
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleCancel}
                  style={{
                    flex: 1,
                    backgroundColor: '#374151',
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{
                    color: 'white',
                    fontWeight: 'bold',
                    fontFamily: 'System'
                  }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* FriendList Component - Only show for own profile */}
        {isOwnProfile && <FriendList userId={userId} isOwnProfile={isOwnProfile} />}

        {/* ProfileEvents Component */}
        <ProfileEvents userId={userId} isOwnProfile={isOwnProfile} />

        {/* Posts Section */}
        <View>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#ffffff',
              fontFamily: 'System'
            }}>
              Recent Posts {profile.recent_posts && profile.recent_posts.length > 0 && `(${profile.recent_posts.length})`}
            </Text>
            
            {/* Liked Posts Button - Only for own profile */}
            {isOwnProfile && (
              <TouchableOpacity style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: '#374151',
                borderRadius: 8
              }}>
                <Heart size={16} color="white" />
                <Text style={{
                  color: 'white',
                  fontWeight: 'bold',
                  fontFamily: 'System'
                }}>
                  Liked Posts
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Recent Posts */}
          {profile.recent_posts && profile.recent_posts.length > 0 ? (
            profile.recent_posts.map((post) => (
              <PostItem key={post._id} post={post} />
            ))
          ) : (
            <View style={{
              backgroundColor: '#171717',
              borderRadius: 8,
              padding: 32,
              alignItems: 'center'
            }}>
              <Text style={{
                color: '#9ca3af',
                fontSize: 16,
                textAlign: 'center',
                fontFamily: 'System'
              }}>
                {isOwnProfile ? "You haven't posted anything yet." : `${profile.username} hasn't posted anything yet.`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default Profile;