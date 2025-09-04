import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  Platform
} from 'react-native';
import { 
  X, 
  ImageIcon, 
  Send, 
  Smile, 
  Hash, 
  AtSign 
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_BASE_URL } from '../../../src/config/api';
import * as SecureStore from 'expo-secure-store';

function CreatePost({ onFocusChange }) {
  // Post state
  const [content, setContent] = useState('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postMessage, setPostMessage] = useState('');
  const [postError, setPostError] = useState('');
  
  // Image upload state
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Interactive buttons state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);

  // Common emojis for quick selection
  const commonEmojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '💯', '✨', '😍', '🤔', '😭', '😎', '🥳', '🤩', '😅', '🙏'];

  // Common hashtags for suggestions
  const commonHashtags = ['#yapp', '#life', '#fun', '#friends', '#love', '#happy'];

  // Mock user suggestions for mentions
  const userSuggestions = [
    { id: 1, username: 'john_doe', name: 'John Doe' },
    { id: 2, username: 'jane_smith', name: 'Jane Smith' },
    { id: 3, username: 'mike_wilson', name: 'Mike Wilson' },
    { id: 4, username: 'sarah_jones', name: 'Sarah Jones' },
    { id: 5, username: 'alex_brown', name: 'Alex Brown' }
  ];

  // Focus handlers
  const handleFocus = () => {
    if (onFocusChange) onFocusChange(true);
  };

  const handleBlur = () => {
    if (onFocusChange) onFocusChange(false);
  };

  // Emoji picker functionality
  const handleEmojiClick = (emoji) => {
    setContent(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Hashtag functionality
  const handleHashtagClick = (hashtag) => {
    setContent(prev => prev + hashtag + ' ');
    setShowHashtagSuggestions(false);
  };

  // Mention functionality
  const handleMentionClick = (user) => {
    const mention = `@${user.username} `;
    setContent(prev => prev + mention);
    setShowMentionSuggestions(false);
  };

  // Image handling functions
  const handleImageSelect = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled) {
        const maxImages = 4;
        const newImages = result.assets.slice(0, maxImages - selectedImages.length);
        
        if (selectedImages.length + newImages.length > maxImages) {
          Alert.alert('Too Many Images', `You can only upload up to ${maxImages} images per post`);
          return;
        }

        setSelectedImages(prev => [...prev, ...newImages]);
        setImagePreviewUrls(prev => [...prev, ...newImages.map(img => img.uri)]);
        setPostError('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select images');
    }
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (selectedImages.length === 0) return [];

    setUploadingImages(true);
    const uploadedImageUrls = [];

    try {
      const token = await SecureStore.getItemAsync('token');
      
      for (const image of selectedImages) {
        const formData = new FormData();
        formData.append('image', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.fileName || `image_${Date.now()}.jpg`
        });

        const response = await fetch(`${API_BASE_URL}/posts/upload-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          body: formData
        });

        const data = await response.json();
        
        if (response.ok) {
          uploadedImageUrls.push(data.imageUrl);
        } else {
          throw new Error(data.error || 'Failed to upload image');
        }
      }

      return uploadedImageUrls;
    } finally {
      setUploadingImages(false);
    }
  };

  const handlePostSubmit = async () => {
    if (!content.trim() && selectedImages.length === 0) {
      setPostError('Content or images are required');
      return;
    }

    setIsSubmittingPost(true);
    setPostError('');
    setPostMessage('');

    try {
      const token = await SecureStore.getItemAsync('token');
      
      if (!token) {
        setPostError('You must be logged in to create a post');
        setIsSubmittingPost(false);
        return;
      }

      let imageUrls = [];
      if (selectedImages.length > 0) {
        imageUrls = await uploadImages();
      }

      const response = await fetch(`${API_BASE_URL}/posts/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: content.trim(),
          images: imageUrls
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPostMessage('Post created successfully!');
        setContent('');
        setSelectedImages([]);
        setImagePreviewUrls([]);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setPostMessage('');
        }, 3000);
      } else {
        setPostError(data.error || 'Failed to create post');
      }
    } catch (err) {
      setPostError('Network error. Please try again.');
    } finally {
      setIsSubmittingPost(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Content Textarea */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{
          color: '#ffffff',
          fontSize: 16,
          fontWeight: 'bold',
          marginBottom: 8,
          fontFamily: 'System'
        }}>
          What's on your mind?
        </Text>
        <View style={{
          position: 'relative',
          borderRadius: 12,
          overflow: 'hidden'
        }}>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Share your thoughts, moments, or experiences..."
            placeholderTextColor="#9ca3af"
            maxLength={280}
            editable={!isSubmittingPost}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 2,
              borderColor: '#6b7280',
              borderRadius: 12,
              color: '#ffffff',
              fontSize: 16,
              padding: 16,
              minHeight: 120,
              fontFamily: 'System'
            }}
          />
          
          {/* Character Counter */}
          <View style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            backgroundColor: content.length > 260 ? 'rgba(239, 68, 68, 0.2)' : 
                            content.length > 200 ? 'rgba(245, 158, 11, 0.2)' : 
                            'rgba(255, 255, 255, 0.1)',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: content.length > 260 ? 'rgba(239, 68, 68, 0.3)' : 
                         content.length > 200 ? 'rgba(245, 158, 11, 0.3)' : 
                         'rgba(107, 114, 128, 0.3)'
          }}>
            <Text style={{
              color: content.length > 260 ? '#fca5a5' : 
                     content.length > 200 ? '#fbbf24' : 
                     '#9ca3af',
              fontSize: 12,
              fontWeight: '600',
              fontFamily: 'System'
            }}>
              {content.length}/280
            </Text>
          </View>
        </View>
      </View>
      
      {/* Image Upload Section */}
      <View style={{ marginBottom: 20 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12
        }}>
          <ImageIcon size={16} color="#f97316" />
          <Text style={{
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 'bold',
            marginLeft: 8,
            fontFamily: 'System'
          }}>
            Add Photos (Optional)
          </Text>
        </View>
        
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16
        }}>
          <TouchableOpacity
            onPress={handleImageSelect}
            disabled={isSubmittingPost || uploadingImages}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 12,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 2,
              borderColor: '#6b7280',
              borderRadius: 12,
              opacity: (isSubmittingPost || uploadingImages) ? 0.6 : 1
            }}
          >
            <ImageIcon size={20} color="#f97316" />
            <Text style={{
              color: '#f97316',
              fontSize: 16,
              fontWeight: 'bold',
              marginLeft: 8,
              fontFamily: 'System'
            }}>
              Choose Images
            </Text>
          </TouchableOpacity>
          
          <View style={{
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <View style={{
              width: 8,
              height: 8,
              backgroundColor: '#f97316',
              borderRadius: 4,
              marginRight: 8
            }} />
            <Text style={{
              color: '#9ca3af',
              fontSize: 14,
              fontWeight: '600',
              fontFamily: 'System'
            }}>
              {selectedImages.length}/4 images
            </Text>
          </View>
        </View>

        {/* Image Previews */}
        {imagePreviewUrls.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {imagePreviewUrls.map((url, index) => (
              <View key={index} style={{
                position: 'relative',
                borderRadius: 12,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(107, 114, 128, 0.5)'
              }}>
                <Image 
                  source={{ uri: url }}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 12
                  }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: '#ef4444',
                    borderRadius: 12,
                    padding: 4
                  }}
                >
                  <X size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      
      {/* Action Bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(107, 114, 128, 0.5)'
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16
        }}>
          {/* Emoji Button */}
          <TouchableOpacity 
            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: showEmojiPicker ? 'rgba(249, 115, 22, 0.2)' : 'transparent'
            }}
          >
            <Smile size={20} color={showEmojiPicker ? '#f97316' : '#9ca3af'} />
          </TouchableOpacity>

          {/* Hashtag Button */}
          <TouchableOpacity 
            onPress={() => setShowHashtagSuggestions(!showHashtagSuggestions)}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: showHashtagSuggestions ? 'rgba(249, 115, 22, 0.2)' : 'transparent'
            }}
          >
            <Hash size={20} color={showHashtagSuggestions ? '#f97316' : '#9ca3af'} />
          </TouchableOpacity>

          {/* Mention Button */}
          <TouchableOpacity 
            onPress={() => setShowMentionSuggestions(!showMentionSuggestions)}
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: showMentionSuggestions ? 'rgba(249, 115, 22, 0.2)' : 'transparent'
            }}
          >
            <AtSign size={20} color={showMentionSuggestions ? '#f97316' : '#9ca3af'} />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          onPress={handlePostSubmit}
          disabled={
            isSubmittingPost || 
            uploadingImages || 
            (!content.trim() && selectedImages.length === 0)
          }
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 12,
            backgroundColor: (isSubmittingPost || uploadingImages || (!content.trim() && selectedImages.length === 0)) 
              ? '#6b7280' : '#f97316',
            borderRadius: 12,
            opacity: (isSubmittingPost || uploadingImages || (!content.trim() && selectedImages.length === 0)) ? 0.6 : 1
          }}
        >
          {isSubmittingPost || uploadingImages ? (
            <>
              <ActivityIndicator size="small" color="white" />
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontWeight: 'bold',
                marginLeft: 8,
                fontFamily: 'System'
              }}>
                {uploadingImages ? 'Uploading...' : 'Creating...'}
              </Text>
            </>
          ) : (
            <>
              <Send size={20} color="white" />
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontWeight: 'bold',
                marginLeft: 8,
                fontFamily: 'System'
              }}>
                Create Post
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Success/Error Messages */}
      {postMessage !== '' && (
        <View style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          borderWidth: 1,
          borderRadius: 8
        }}>
          <Text style={{
            color: '#6ee7b7',
            fontWeight: '600',
            fontFamily: 'System'
          }}>
            ✅ {postMessage}
          </Text>
        </View>
      )}

      {postError !== '' && (
        <View style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          borderWidth: 1,
          borderRadius: 8
        }}>
          <Text style={{
            color: '#fca5a5',
            fontWeight: '600',
            fontFamily: 'System'
          }}>
            ❌ {postError}
          </Text>
        </View>
      )}

      {/* Emoji Picker Modal */}
      <Modal
        visible={showEmojiPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEmojiPicker(false)}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          onPress={() => setShowEmojiPicker(false)}
        >
          <View style={{
            backgroundColor: '#1f2937',
            borderRadius: 16,
            padding: 20,
            width: '80%',
            maxWidth: 300
          }}>
            <Text style={{
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 16,
              textAlign: 'center',
              fontFamily: 'System'
            }}>
              Pick an Emoji
            </Text>
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center'
            }}>
              {commonEmojis.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleEmojiClick(emoji)}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Hashtag Suggestions Modal */}
      <Modal
        visible={showHashtagSuggestions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHashtagSuggestions(false)}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          onPress={() => setShowHashtagSuggestions(false)}
        >
          <View style={{
            backgroundColor: '#1f2937',
            borderRadius: 16,
            padding: 20,
            width: '80%',
            maxWidth: 300
          }}>
            <Text style={{
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 16,
              textAlign: 'center',
              fontFamily: 'System'
            }}>
              Popular Hashtags
            </Text>
            <View style={{ gap: 8 }}>
              {commonHashtags.map((hashtag, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleHashtagClick(hashtag)}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <Text style={{
                    color: '#f97316',
                    fontSize: 16,
                    fontFamily: 'System'
                  }}>
                    {hashtag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Mention Suggestions Modal */}
      <Modal
        visible={showMentionSuggestions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMentionSuggestions(false)}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          onPress={() => setShowMentionSuggestions(false)}
        >
          <View style={{
            backgroundColor: '#1f2937',
            borderRadius: 16,
            padding: 20,
            width: '80%',
            maxWidth: 300
          }}>
            <Text style={{
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 16,
              textAlign: 'center',
              fontFamily: 'System'
            }}>
              Mention Someone
            </Text>
            <View style={{ gap: 8 }}>
              {userSuggestions.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  onPress={() => handleMentionClick(user)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <View style={{
                    width: 32,
                    height: 32,
                    backgroundColor: '#f97316',
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                  }}>
                    <Text style={{
                      color: 'white',
                      fontSize: 14,
                      fontWeight: 'bold',
                      fontFamily: 'System'
                    }}>
                      {user.name.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text style={{
                      color: '#ffffff',
                      fontSize: 16,
                      fontWeight: '600',
                      fontFamily: 'System'
                    }}>
                      {user.name}
                    </Text>
                    <Text style={{
                      color: '#9ca3af',
                      fontSize: 14,
                      fontFamily: 'System'
                    }}>
                      @{user.username}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default CreatePost;