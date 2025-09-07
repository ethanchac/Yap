import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  Alert,
  Modal,
  Dimensions
} from 'react-native';
import { Heart, MessageCircle, Trash2, MoreHorizontal } from 'lucide-react-native';
import { API_BASE_URL } from '../../src/config/api';
import * as SecureStore from 'expo-secure-store';

const { width: screenWidth } = Dimensions.get('window');

function PostItem({ post, onPostDeleted }) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Get current user info on component mount
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.profile || data);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  // Check if user has liked this post when component mounts
  useEffect(() => {
    checkLikeStatus();
  }, [post._id]);

  const checkLikeStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/posts/${post._id}/like-status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLiked(data.liked);
      }
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const handleLike = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      
      if (!token) {
        Alert.alert('Authentication Required', 'Please login to like posts');
        return;
      }

      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/posts/${post._id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setLiked(data.liked);
        setLikesCount(prev => data.liked ? prev + 1 : prev - 1);
      } else {
        Alert.alert('Error', data.error || 'Failed to like post');
      }
    } catch (error) {
      console.error('Network error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      
      if (!token) {
        Alert.alert('Authentication Required', 'Please login to delete posts');
        return;
      }

      setDeleting(true);

      const response = await fetch(`${API_BASE_URL}/posts/${post._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        if (onPostDeleted) {
          onPostDeleted(post._id);
        }
        Alert.alert('Success', 'Post deleted successfully');
      } else {
        Alert.alert('Error', data.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setShowMenu(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const getProfilePictureUrl = (profilePicture) => {
    if (!profilePicture) return null;
    return profilePicture.startsWith('http') ? profilePicture : `${API_BASE_URL}${profilePicture}`;
  };

  const getDefaultProfilePicture = () => {
    return `${API_BASE_URL}/uploads/profile_pictures/default-avatar.png`;
  };

  const renderPostImages = () => {
    if (!post.images || post.images.length === 0) return null;

    const imageCount = post.images.length;
    const imageWidth = screenWidth - 80; // Account for padding and margins

    if (imageCount === 1) {
      return (
        <View style={{ marginTop: 12 }}>
          <Image 
            source={{ uri: post.images[0] }}
            style={{ 
              width: imageWidth,
              height: 250,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#374151'
            }}
            resizeMode="cover"
            onError={() => console.error('Failed to load image')}
          />
        </View>
      );
    }

    if (imageCount === 2) {
      return (
        <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
          {post.images.map((image, index) => (
            <Image 
              key={index}
              source={{ uri: image }}
              style={{ 
                width: (imageWidth - 8) / 2,
                height: 150,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#374151'
              }}
              resizeMode="cover"
              onError={() => console.error('Failed to load image')}
            />
          ))}
        </View>
      );
    }

    if (imageCount >= 3) {
      return (
        <View style={{ marginTop: 12 }}>
          <Image 
            source={{ uri: post.images[0] }}
            style={{ 
              width: imageWidth,
              height: 150,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#374151',
              marginBottom: 8
            }}
            resizeMode="cover"
            onError={() => console.error('Failed to load image')}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {post.images.slice(1, 3).map((image, index) => (
              <Image 
                key={index + 1}
                source={{ uri: image }}
                style={{ 
                  width: (imageWidth - 8) / 2,
                  height: 100,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#374151'
                }}
                resizeMode="cover"
                onError={() => console.error('Failed to load image')}
              />
            ))}
          </View>
          {imageCount > 3 && (
            <View style={{ 
              position: 'absolute', 
              bottom: 8, 
              right: 8, 
              backgroundColor: 'rgba(0,0,0,0.6)', 
              paddingHorizontal: 8, 
              paddingVertical: 4,
              borderRadius: 4 
            }}>
              <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                +{imageCount - 3}
              </Text>
            </View>
          )}
        </View>
      );
    }

    return null;
  };

  // Check if current user owns this post
  const isOwnPost = currentUser && currentUser._id === post.user_id;

  return (
    <View style={{
      backgroundColor: '#171717',
      borderRadius: 8,
      padding: 24,
      marginBottom: 16,
      borderWidth: 0
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {/* Profile Picture */}
        <TouchableOpacity>
          <Image 
            source={{ uri: getProfilePictureUrl(post.profile_picture) || getDefaultProfilePicture() }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24
            }}
            onError={(e) => {
              e.target.source = { uri: getDefaultProfilePicture() };
            }}
          />
        </TouchableOpacity>
        
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity>
                <Text style={{ 
                  fontWeight: 'bold', 
                  color: '#ffffff',
                  fontFamily: 'System'
                }}>
                  @{post.username}
                </Text>
              </TouchableOpacity>
              <Text style={{ 
                fontSize: 12, 
                color: '#9ca3af',
                fontFamily: 'System'
              }}>
                {formatDate(post.created_at)}
              </Text>
            </View>
            
            {/* More options menu (only for own posts) */}
            {isOwnPost && (
              <TouchableOpacity
                onPress={() => setShowMenu(!showMenu)}
                style={{ padding: 8 }}
              >
                <MoreHorizontal size={16} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Post Content */}
          {post.content && (
            <Text style={{ 
              marginBottom: 12, 
              lineHeight: 20,
              color: '#ffffff',
              fontSize: 16,
              fontFamily: 'System'
            }}>
              {post.content}
            </Text>
          )}
          
          {/* Post Images */}
          {renderPostImages()}
          
          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 16 }}>
            <TouchableOpacity 
              onPress={handleLike}
              disabled={loading}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Heart 
                size={20} 
                color={liked ? '#ef4444' : '#9ca3af'}
                fill={liked ? '#ef4444' : 'none'}
              />
              <Text style={{ 
                fontSize: 14, 
                fontWeight: 'bold',
                color: '#9ca3af',
                fontFamily: 'System'
              }}>
                {likesCount}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <MessageCircle size={20} color="#9ca3af" />
              <Text style={{ 
                fontSize: 14, 
                fontWeight: 'bold',
                color: '#9ca3af',
                fontFamily: 'System'
              }}>
                {post.comments_count}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          onPress={() => setShowMenu(false)}
        >
          <View style={{
            backgroundColor: '#1c1c1c',
            borderRadius: 8,
            padding: 4,
            minWidth: 120,
            borderWidth: 1,
            borderColor: '#374151'
          }}>
            <TouchableOpacity
              onPress={() => {
                setShowDeleteConfirm(true);
                setShowMenu(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                padding: 12
              }}
            >
              <Trash2 size={16} color="#ef4444" />
              <Text style={{ 
                color: '#ef4444',
                fontFamily: 'System'
              }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#1c1c1c',
            borderRadius: 8,
            padding: 16,
            width: 250,
            alignItems: 'center'
          }}>
            <Trash2 size={20} color="#ef4444" style={{ marginBottom: 8 }} />
            
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              marginBottom: 8,
              color: '#ffffff',
              fontFamily: 'System'
            }}>
              Delete Post
            </Text>
            
            <Text style={{
              fontSize: 12,
              marginBottom: 16,
              color: '#9ca3af',
              textAlign: 'center',
              fontFamily: 'System'
            }}>
              This action cannot be undone.
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: '#374151',
                  borderRadius: 6
                }}
              >
                <Text style={{
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: '500',
                  color: '#d1d5db',
                  fontFamily: 'System'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: '#dc2626',
                  borderRadius: 6
                }}
              >
                <Text style={{
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: '500',
                  color: 'white',
                  fontFamily: 'System'
                }}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default PostItem;