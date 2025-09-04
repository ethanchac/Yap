import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Plus, Calendar, MapPin, Users, Type, FileText } from 'lucide-react-native';
import { API_BASE_URL } from '../../src/config/api';
import * as SecureStore from 'expo-secure-store';

export default function Create() {
  const [postType, setPostType] = useState('post'); // 'post' or 'event'
  const [formData, setFormData] = useState({
    // Post fields
    content: '',
    
    // Event fields
    title: '',
    description: '',
    event_datetime: '',
    location: '',
    max_attendees: ''
  });
  const [loading, setLoading] = useState(false);

  const getAuthHeaders = async () => {
    const token = await SecureStore.getItemAsync('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const handleSubmit = async () => {
    if (postType === 'post') {
      await createPost();
    } else {
      await createEvent();
    }
  };

  const createPost = async () => {
    if (!formData.content.trim()) {
      Alert.alert('Error', 'Please write some content for your post');
      return;
    }

    try {
      setLoading(true);
      
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/posts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: formData.content.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create post');
      }

      Alert.alert('Success', 'Your post has been created!', [
        { text: 'OK', onPress: () => {
          setFormData({ ...formData, content: '' });
        }}
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }
    if (!formData.event_datetime) {
      Alert.alert('Error', 'Please enter event date and time');
      return;
    }

    try {
      setLoading(true);
      
      const headers = await getAuthHeaders();
      
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        event_datetime: formData.event_datetime,
        location: formData.location.trim(),
        ...(formData.max_attendees && { max_attendees: parseInt(formData.max_attendees) })
      };
      
      const response = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      Alert.alert('Success', 'Your event has been created!', [
        { text: 'OK', onPress: () => {
          setFormData({
            content: '',
            title: '',
            description: '',
            event_datetime: '',
            location: '',
            max_attendees: ''
          });
        }}
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      {/* Header */}
      <View style={{
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: '#121212',
        borderBottomWidth: 0
      }}>
        <Text style={{
          fontSize: 28,
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: 8,
          fontFamily: 'System'
        }}>
          Create
        </Text>
        <Text style={{
          fontSize: 16,
          color: '#9ca3af',
          fontFamily: 'System'
        }}>
          Share your thoughts or create an event
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
      >
        {/* Type Selector */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: '#1f2937',
          borderRadius: 8,
          padding: 4,
          marginBottom: 24
        }}>
          <TouchableOpacity
            onPress={() => setPostType('post')}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              backgroundColor: postType === 'post' ? '#f97316' : 'transparent',
              borderRadius: 6
            }}
          >
            <Text style={{
              color: postType === 'post' ? 'white' : '#9ca3af',
              fontWeight: postType === 'post' ? 'bold' : 'normal',
              fontFamily: 'System'
            }}>
              Create Post
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setPostType('event')}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              backgroundColor: postType === 'event' ? '#f97316' : 'transparent',
              borderRadius: 6
            }}
          >
            <Text style={{
              color: postType === 'event' ? 'white' : '#9ca3af',
              fontWeight: postType === 'event' ? 'bold' : 'normal',
              fontFamily: 'System'
            }}>
              Create Event
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        {postType === 'post' ? (
          <View style={{ gap: 16 }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Type size={16} color="#f97316" />
                <Text style={{
                  color: '#ffffff',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginLeft: 8,
                  fontFamily: 'System'
                }}>
                  What's on your mind?
                </Text>
              </View>
              <TextInput
                value={formData.content}
                onChangeText={(text) => setFormData({ ...formData, content: text })}
                placeholder="Share your thoughts..."
                placeholderTextColor="#6b7280"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                style={{
                  backgroundColor: '#1f2937',
                  borderRadius: 8,
                  padding: 16,
                  color: '#ffffff',
                  fontSize: 16,
                  minHeight: 120,
                  fontFamily: 'System'
                }}
              />
            </View>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {/* Event Title */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Type size={16} color="#f97316" />
                <Text style={{
                  color: '#ffffff',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginLeft: 8,
                  fontFamily: 'System'
                }}>
                  Event Title
                </Text>
              </View>
              <TextInput
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Enter event title..."
                placeholderTextColor="#6b7280"
                style={{
                  backgroundColor: '#1f2937',
                  borderRadius: 8,
                  padding: 16,
                  color: '#ffffff',
                  fontSize: 16,
                  fontFamily: 'System'
                }}
              />
            </View>

            {/* Event Description */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <FileText size={16} color="#f97316" />
                <Text style={{
                  color: '#ffffff',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginLeft: 8,
                  fontFamily: 'System'
                }}>
                  Description
                </Text>
              </View>
              <TextInput
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Describe your event..."
                placeholderTextColor="#6b7280"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={{
                  backgroundColor: '#1f2937',
                  borderRadius: 8,
                  padding: 16,
                  color: '#ffffff',
                  fontSize: 16,
                  minHeight: 100,
                  fontFamily: 'System'
                }}
              />
            </View>

            {/* Event Date/Time */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Calendar size={16} color="#f97316" />
                <Text style={{
                  color: '#ffffff',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginLeft: 8,
                  fontFamily: 'System'
                }}>
                  Date & Time
                </Text>
              </View>
              <TextInput
                value={formData.event_datetime}
                onChangeText={(text) => setFormData({ ...formData, event_datetime: text })}
                placeholder="YYYY-MM-DD HH:MM (e.g., 2024-12-25 18:00)"
                placeholderTextColor="#6b7280"
                style={{
                  backgroundColor: '#1f2937',
                  borderRadius: 8,
                  padding: 16,
                  color: '#ffffff',
                  fontSize: 16,
                  fontFamily: 'System'
                }}
              />
            </View>

            {/* Location */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MapPin size={16} color="#f97316" />
                <Text style={{
                  color: '#ffffff',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginLeft: 8,
                  fontFamily: 'System'
                }}>
                  Location
                </Text>
              </View>
              <TextInput
                value={formData.location}
                onChangeText={(text) => setFormData({ ...formData, location: text })}
                placeholder="Enter event location..."
                placeholderTextColor="#6b7280"
                style={{
                  backgroundColor: '#1f2937',
                  borderRadius: 8,
                  padding: 16,
                  color: '#ffffff',
                  fontSize: 16,
                  fontFamily: 'System'
                }}
              />
            </View>

            {/* Max Attendees */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Users size={16} color="#f97316" />
                <Text style={{
                  color: '#ffffff',
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginLeft: 8,
                  fontFamily: 'System'
                }}>
                  Max Attendees (Optional)
                </Text>
              </View>
              <TextInput
                value={formData.max_attendees}
                onChangeText={(text) => setFormData({ ...formData, max_attendees: text })}
                placeholder="Enter maximum number of attendees..."
                placeholderTextColor="#6b7280"
                keyboardType="numeric"
                style={{
                  backgroundColor: '#1f2937',
                  borderRadius: 8,
                  padding: 16,
                  color: '#ffffff',
                  fontSize: 16,
                  fontFamily: 'System'
                }}
              />
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#6b7280' : '#f97316',
            borderRadius: 8,
            padding: 16,
            alignItems: 'center',
            marginTop: 24
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Plus size={20} color="white" />
              <Text style={{
                color: 'white',
                fontSize: 18,
                fontWeight: 'bold',
                marginLeft: 8,
                fontFamily: 'System'
              }}>
                {postType === 'post' ? 'Create Post' : 'Create Event'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}