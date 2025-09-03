import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { ChevronRight, Check } from 'lucide-react-native';
import { API_BASE_URL } from '../../src/config/api';
import * as SecureStore from 'expo-secure-store';

function FriendList({ userId, isOwnProfile }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get auth headers (matching PostItem pattern)
  const getAuthHeaders = async () => {
    const token = await SecureStore.getItemAsync('token');
    return {
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
      
      const headers = await getAuthHeaders();
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch friends');
      }
      
      const data = await response.json();
      setFriends(data.friends || []);
    } catch (err) {
      console.error('❌ Error fetching friends:', err);
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
    // Return default avatar
    return `${API_BASE_URL}/uploads/profile_pictures/default-avatar.png`;
  };

  // Handle friend click (navigate to their profile)
  const handleFriendClick = (friend) => {
    // TODO: Navigate to friend's profile
    console.log('Navigate to friend profile:', friend._id);
  };

  if (loading) {
    return (
      <View style={{
        backgroundColor: '#171717',
        borderRadius: 8,
        padding: 24,
        marginBottom: 16
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: 16,
          fontFamily: 'System'
        }}>
          Friends
        </Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {[...Array(5)].map((_, i) => (
            <View key={i} style={{ alignItems: 'center' }}>
              <View style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: '#374151',
                marginBottom: 8
              }} />
              <View style={{
                width: 48,
                height: 12,
                borderRadius: 6,
                backgroundColor: '#374151'
              }} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{
        backgroundColor: '#171717',
        borderRadius: 8,
        padding: 24,
        marginBottom: 16
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: 16,
          fontFamily: 'System'
        }}>
          Friends
        </Text>
        <Text style={{
          color: '#fca5a5',
          fontSize: 14,
          fontFamily: 'System'
        }}>
          Failed to load friends
        </Text>
      </View>
    );
  }

  if (friends.length === 0) {
    return (
      <View style={{
        backgroundColor: '#171717',
        borderRadius: 8,
        padding: 24,
        marginBottom: 16
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: 16,
          fontFamily: 'System'
        }}>
          Friends
        </Text>
        <Text style={{
          color: '#9ca3af',
          fontSize: 14,
          fontFamily: 'System'
        }}>
          {isOwnProfile ? "You don't have any mutual friends yet." : "No mutual friends to show."}
        </Text>
      </View>
    );
  }

  return (
    <View style={{
      backgroundColor: '#171717',
      borderRadius: 8,
      padding: 24,
      marginBottom: 16
    }}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#ffffff',
          fontFamily: 'System'
        }}>
          Friends {friends.length > 0 && (
            <Text style={{
              fontWeight: 'normal',
              color: '#9ca3af'
            }}>
              ({friends.length})
            </Text>
          )}
        </Text>
        {friends.length > 7 && (
          <TouchableOpacity style={{
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Text style={{
              color: '#60a5fa',
              fontSize: 14,
              fontWeight: 'bold',
              fontFamily: 'System'
            }}>
              See all
            </Text>
            <ChevronRight size={16} color="#60a5fa" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 16 }}
      >
        {friends.slice(0, 7).map((friend) => (
          <TouchableOpacity 
            key={friend._id}
            onPress={() => handleFriendClick(friend)}
            style={{ alignItems: 'center', width: 70 }}
          >
            <View style={{ position: 'relative', marginBottom: 8 }}>
              <Image 
                source={{ uri: getProfilePictureUrl(friend) }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  borderWidth: 2,
                  borderColor: '#374151'
                }}
                onError={() => console.log('Friend profile image failed to load')}
              />
              {friend.is_verified && (
                <View style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 20,
                  height: 20,
                  backgroundColor: '#3b82f6',
                  borderRadius: 10,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Check size={12} color="white" />
                </View>
              )}
            </View>
            <Text style={{
              color: '#ffffff',
              fontSize: 14,
              fontWeight: '500',
              textAlign: 'center',
              fontFamily: 'System'
            }} numberOfLines={1}>
              {friend.username}
            </Text>
          </TouchableOpacity>
        ))}
        
        {friends.length > 7 && (
          <TouchableOpacity style={{ alignItems: 'center', width: 70 }}>
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#374151',
              borderWidth: 2,
              borderColor: '#374151',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 8
            }}>
              <Text style={{
                color: '#ffffff',
                fontSize: 12,
                fontWeight: 'bold',
                fontFamily: 'System'
              }}>
                +{friends.length - 7}
              </Text>
            </View>
            <Text style={{
              color: '#9ca3af',
              fontSize: 14,
              fontWeight: '500',
              textAlign: 'center',
              fontFamily: 'System'
            }}>
              More
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

export default FriendList;