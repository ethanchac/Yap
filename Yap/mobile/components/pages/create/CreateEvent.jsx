import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform
} from 'react-native';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ImageIcon, 
  X,
  Send
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import EventLocationMap from './EventLocationMap';
import { API_BASE_URL } from '../../../src/config/api';
import * as SecureStore from 'expo-secure-store';

function CreateEvent({ onFocusChange }) {
  // Event state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState(null);
  const [locationTitle, setLocationTitle] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [eventMessage, setEventMessage] = useState('');
  const [eventError, setEventError] = useState('');
  
  // Image upload state
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Get today's date for minimum date validation
  const today = new Date().toISOString().split('T')[0];

  // Focus handlers
  const handleFocus = () => {
    if (onFocusChange) onFocusChange(true);
  };

  const handleBlur = () => {
    if (onFocusChange) onFocusChange(false);
  };

  // Format date display
  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'Select date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time display
  const formatTimeDisplay = (timeString) => {
    if (!timeString) return 'Select time';
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Handle location selection from map
  const handleLocationSelect = (locationData) => {
    setEventLocation(locationData);
    // Auto-populate location title with the address if no title is set
    if (!locationTitle && locationData.address) {
      setLocationTitle(locationData.address);
    }
  };

  // Handle clearing location
  const handleLocationClear = () => {
    setEventLocation(null);
    setLocationTitle('');
  };

  // Get display location (title or coordinates)
  const getLocationDisplay = () => {
    if (!eventLocation) return null;
    if (locationTitle.trim()) return locationTitle.trim();
    return `${eventLocation.lat.toFixed(6)}, ${eventLocation.lng.toFixed(6)}`;
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
        allowsMultipleSelection: false,
        quality: 0.8,
        allowsEditing: true,
        aspect: [16, 9],
      });

      if (!result.canceled) {
        const image = result.assets[0];
        setSelectedImage(image);
        setImagePreviewUrl(image.uri);
        setEventError('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreviewUrl('');
  };

  const uploadImage = async () => {
    if (!selectedImage) return null;

    setUploadingImage(true);
    try {
      const token = await SecureStore.getItemAsync('token');
      
      const formData = new FormData();
      formData.append('image', {
        uri: selectedImage.uri,
        type: selectedImage.type || 'image/jpeg',
        name: selectedImage.fileName || `event_image_${Date.now()}.jpg`
      });

      const response = await fetch(`${API_BASE_URL}/events/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        return data.imageUrl;
      } else {
        throw new Error(data.error || 'Failed to upload image');
      }
    } finally {
      setUploadingImage(false);
    }
  };

  // Event submit function
  const handleEventSubmit = async () => {
    // Validate required fields
    if (!eventTitle.trim()) {
      setEventError('Event title is required');
      return;
    }
    if (!eventDescription.trim()) {
      setEventError('Event description is required');
      return;
    }
    if (!eventDate) {
      setEventError('Event date is required');
      return;
    }
    if (!eventTime) {
      setEventError('Event time is required');
      return;
    }

    setIsSubmittingEvent(true);
    setEventError('');
    setEventMessage('');

    try {
      const token = await SecureStore.getItemAsync('token');
      
      if (!token) {
        setEventError('You must be logged in to create an event');
        setIsSubmittingEvent(false);
        return;
      }

      // Upload image if selected
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage();
      }

      const eventData = {
        title: eventTitle,
        description: eventDescription,
        event_date: eventDate,
        event_time: eventTime,
        location: getLocationDisplay(),
        location_title: locationTitle.trim() || null,
        latitude: eventLocation ? eventLocation.lat : null,
        longitude: eventLocation ? eventLocation.lng : null,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        image: imageUrl
      };

      const response = await fetch(`${API_BASE_URL}/events/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });

      const data = await response.json();

      if (response.ok) {
        setEventMessage('Event created successfully!');
        
        // Reset form
        setEventTitle('');
        setEventDescription('');
        setEventDate('');
        setEventTime('');
        setEventLocation(null);
        setLocationTitle('');
        setMaxAttendees('');
        setSelectedImage(null);
        setImagePreviewUrl('');
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setEventMessage('');
        }, 3000);
      } else {
        setEventError(data.error || 'Failed to create event');
      }
    } catch (err) {
      setEventError('Network error. Please try again.');
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  return (
    <ScrollView 
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      {/* Event Title */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{
          color: '#ffffff',
          fontSize: 16,
          fontWeight: 'bold',
          marginBottom: 8,
          fontFamily: 'System'
        }}>
          Event Title *
        </Text>
        <TextInput
          value={eventTitle}
          onChangeText={setEventTitle}
          placeholder="Enter event title..."
          placeholderTextColor="#9ca3af"
          maxLength={100}
          editable={!isSubmittingEvent}
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
            fontFamily: 'System'
          }}
        />
      </View>

      {/* Event Description */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{
          color: '#ffffff',
          fontSize: 16,
          fontWeight: 'bold',
          marginBottom: 8,
          fontFamily: 'System'
        }}>
          Event Description *
        </Text>
        <TextInput
          value={eventDescription}
          onChangeText={setEventDescription}
          placeholder="Describe your event..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          editable={!isSubmittingEvent}
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
            minHeight: 100,
            fontFamily: 'System'
          }}
        />
      </View>

      {/* Date and Time Row */}
      <View style={{
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20
      }}>
        {/* Event Date */}
        <View style={{ flex: 1 }}>
          <Text style={{
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 8,
            fontFamily: 'System'
          }}>
            Date *
          </Text>
          <TouchableOpacity
            disabled={isSubmittingEvent}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 2,
              borderColor: '#6b7280',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <Calendar size={20} color="#f97316" />
            <Text style={{
              color: eventDate ? '#ffffff' : '#9ca3af',
              fontSize: 16,
              marginLeft: 12,
              flex: 1,
              fontFamily: 'System'
            }}>
              {formatDateDisplay(eventDate)}
            </Text>
          </TouchableOpacity>
          {/* Note: In production, you'd integrate a date picker library */}
          <TextInput
            value={eventDate}
            onChangeText={setEventDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#6b7280"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderWidth: 1,
              borderColor: '#4b5563',
              borderRadius: 8,
              color: '#9ca3af',
              fontSize: 14,
              padding: 8,
              marginTop: 4,
              fontFamily: 'System'
            }}
          />
        </View>

        {/* Event Time */}
        <View style={{ flex: 1 }}>
          <Text style={{
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 8,
            fontFamily: 'System'
          }}>
            Time *
          </Text>
          <TouchableOpacity
            disabled={isSubmittingEvent}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 2,
              borderColor: '#6b7280',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center'
            }}
          >
            <Clock size={20} color="#f97316" />
            <Text style={{
              color: eventTime ? '#ffffff' : '#9ca3af',
              fontSize: 16,
              marginLeft: 12,
              flex: 1,
              fontFamily: 'System'
            }}>
              {formatTimeDisplay(eventTime)}
            </Text>
          </TouchableOpacity>
          {/* Note: In production, you'd integrate a time picker library */}
          <TextInput
            value={eventTime}
            onChangeText={setEventTime}
            placeholder="HH:MM (24-hour)"
            placeholderTextColor="#6b7280"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderWidth: 1,
              borderColor: '#4b5563',
              borderRadius: 8,
              color: '#9ca3af',
              fontSize: 14,
              padding: 8,
              marginTop: 4,
              fontFamily: 'System'
            }}
          />
        </View>
      </View>

      {/* Event Location */}
      <View style={{ marginBottom: 20 }}>
        <EventLocationMap
          selectedLocation={eventLocation}
          onLocationSelect={handleLocationSelect}
          onLocationClear={handleLocationClear}
        />
        
        {/* Location Title */}
        {eventLocation && (
          <View style={{ marginTop: 12 }}>
            <Text style={{
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 'bold',
              marginBottom: 8,
              fontFamily: 'System'
            }}>
              Location Name (Optional)
            </Text>
            <TextInput
              value={locationTitle}
              onChangeText={setLocationTitle}
              placeholder="e.g., Student Centre, Building A, etc."
              placeholderTextColor="#9ca3af"
              editable={!isSubmittingEvent}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 2,
                borderColor: '#6b7280',
                borderRadius: 12,
                color: '#ffffff',
                fontSize: 16,
                padding: 16,
                fontFamily: 'System'
              }}
            />
          </View>
        )}
      </View>

      {/* Max Attendees */}
      <View style={{ marginBottom: 20 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 8
        }}>
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
          value={maxAttendees}
          onChangeText={setMaxAttendees}
          placeholder="Enter maximum number of attendees..."
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          editable={!isSubmittingEvent}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 2,
            borderColor: '#6b7280',
            borderRadius: 12,
            color: '#ffffff',
            fontSize: 16,
            padding: 16,
            fontFamily: 'System'
          }}
        />
      </View>

      {/* Event Image */}
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
            Event Image (Optional)
          </Text>
        </View>
        
        {!imagePreviewUrl ? (
          <TouchableOpacity
            onPress={handleImageSelect}
            disabled={isSubmittingEvent || uploadingImage}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 2,
              borderColor: '#6b7280',
              borderRadius: 12,
              borderStyle: 'dashed',
              opacity: (isSubmittingEvent || uploadingImage) ? 0.6 : 1
            }}
          >
            <ImageIcon size={24} color="#f97316" />
            <Text style={{
              color: '#f97316',
              fontSize: 16,
              fontWeight: 'bold',
              marginLeft: 8,
              fontFamily: 'System'
            }}>
              Choose Event Image
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: '#6b7280'
          }}>
            <Image 
              source={{ uri: imagePreviewUrl }}
              style={{
                width: '100%',
                height: 200,
                borderRadius: 12
              }}
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={removeImage}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                backgroundColor: '#ef4444',
                borderRadius: 16,
                padding: 8
              }}
            >
              <X size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity 
        onPress={handleEventSubmit}
        disabled={
          isSubmittingEvent || 
          uploadingImage || 
          !eventTitle.trim() ||
          !eventDescription.trim() ||
          !eventDate ||
          !eventTime
        }
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 16,
          backgroundColor: (isSubmittingEvent || uploadingImage || !eventTitle.trim() || !eventDescription.trim() || !eventDate || !eventTime) 
            ? '#6b7280' : '#f97316',
          borderRadius: 12,
          marginBottom: 20,
          opacity: (isSubmittingEvent || uploadingImage || !eventTitle.trim() || !eventDescription.trim() || !eventDate || !eventTime) ? 0.6 : 1
        }}
      >
        {isSubmittingEvent || uploadingImage ? (
          <>
            <ActivityIndicator size="small" color="white" />
            <Text style={{
              color: 'white',
              fontSize: 18,
              fontWeight: 'bold',
              marginLeft: 8,
              fontFamily: 'System'
            }}>
              {uploadingImage ? 'Uploading Image...' : 'Creating Event...'}
            </Text>
          </>
        ) : (
          <>
            <Send size={20} color="white" />
            <Text style={{
              color: 'white',
              fontSize: 18,
              fontWeight: 'bold',
              marginLeft: 8,
              fontFamily: 'System'
            }}>
              Create Event
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Success/Error Messages */}
      {eventMessage !== '' && (
        <View style={{
          padding: 12,
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 0.3)',
          borderWidth: 1,
          borderRadius: 8,
          marginBottom: 12
        }}>
          <Text style={{
            color: '#6ee7b7',
            fontWeight: '600',
            fontFamily: 'System'
          }}>
            ✅ {eventMessage}
          </Text>
        </View>
      )}

      {eventError !== '' && (
        <View style={{
          padding: 12,
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          borderWidth: 1,
          borderRadius: 8,
          marginBottom: 12
        }}>
          <Text style={{
            color: '#fca5a5',
            fontWeight: '600',
            fontFamily: 'System'
          }}>
            ❌ {eventError}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

export default CreateEvent;