import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions
} from 'react-native';
import { Calendar, MapPin, Users, Clock, Heart } from 'lucide-react-native';
import { API_BASE_URL, testApiConnectivity } from '../../src/config/api';
import * as SecureStore from 'expo-secure-store';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  

  const getAuthHeaders = async () => {
    const token = await SecureStore.getItemAsync('token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchEvents = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      setError('');
      
  // Use the working events endpoint with past events included
  const url = `${API_BASE_URL}/events/feed?limit=20&include_past=true`;
      const headers = await getAuthHeaders();
      
      const response = await fetch(url, {
        method: 'GET', 
        headers: headers
      });
      
  // Response status logging removed for privacy
      
      if (response.ok) {
  const data = await response.json();
        
        if (data.events && Array.isArray(data.events)) {
          setEvents(data.events);
          setError('');
        } else {
          setEvents([]);
          setError('No events found');
        }
      } else {
  const errorText = await response.text();
        setError(`Failed to fetch events: ${response.status}`);
      }
    } catch (err) {
      console.error('❌ Error fetching events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Test API connectivity first
    testApiConnectivity().then(isConnected => {
      console.log('🔗 API connectivity test result:', isConnected);
      if (!isConnected) {
        console.warn('⚠️  API may not be reachable');
        setError('Cannot connect to server. Is the backend running?');
        setLoading(false);
        return;
      }
      fetchEvents();
    });
  }, []);

  const refreshEvents = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const formatEventDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const formatEventTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'Invalid time';
    }
  };

  // Get time status (matching ProfileEvents)
  const getTimeStatus = (eventDateTime) => {
    const now = new Date();
    const eventDate = new Date(eventDateTime);
    const diffTime = eventDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'past', text: 'Past Event', color: '#9ca3af' };
    } else if (diffDays === 0) {
      return { status: 'today', text: 'Today', color: '#10b981' };
    } else if (diffDays === 1) {
      return { status: 'tomorrow', text: 'Tomorrow', color: '#3b82f6' };
    } else if (diffDays <= 7) {
      return { status: 'upcoming', text: `${diffDays} days`, color: '#f59e0b' };
    } else {
      return { status: 'future', text: `${diffDays} days`, color: '#9ca3af' };
    }
  };

  // Get event image (matching frontend EventItem)
  const getEventImage = (event, index) => {
    // Use event image if available, otherwise use random picsum photo
    if (event.image) {
      return event.image;
    }
    // Use a consistent seed based on event ID to get the same random image each time
    const seed = event._id ? event._id.slice(-6) : index.toString().padStart(6, '0');
    return `https://picsum.photos/seed/${seed}/400/300`;
  };

  // Get profile picture URL (matching frontend)
  const getProfilePictureUrl = (profilePicture) => {
    if (!profilePicture) return null;
    return profilePicture.startsWith('http') ? profilePicture : `${API_BASE_URL}${profilePicture}`;
  };

  const getDefaultProfilePicture = () => {
    return `${API_BASE_URL}/uploads/profile_pictures/default-avatar.png`;
  };

  if (loading && events.length === 0) {
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
        }}>Loading events...</Text>
      </View>
    );
  }

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
          Events
        </Text>
        <Text style={{
          fontSize: 16,
          color: '#9ca3af',
          fontFamily: 'System'
        }}>
          Discover events in your area
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1, backgroundColor: '#121212' }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshEvents}
            colors={['#f97316']}
            tintColor="#f97316"
          />
        }
      >
        {error ? (
          <View style={{
            backgroundColor: '#7f1d1d',
            borderColor: '#991b1b',
            borderWidth: 1,
            borderRadius: 8,
            padding: 16,
            marginBottom: 16
          }}>
            <Text style={{ 
              color: '#fca5a5',
              fontFamily: 'System'
            }}>{error}</Text>
          </View>
        ) : null}

        {events.length === 0 ? (
          <View style={{ 
            alignItems: 'center', 
            justifyContent: 'center', 
            paddingVertical: 48 
          }}>
            <Calendar size={48} color="#9ca3af" />
            <Text style={{ 
              color: '#9ca3af',
              fontFamily: 'System',
              marginTop: 16,
              fontSize: 16
            }}>No events available</Text>
            <Text style={{ 
              color: '#6b7280',
              fontFamily: 'System',
              marginTop: 8,
              textAlign: 'center'
            }}>Check back later for upcoming events</Text>
          </View>
        ) : (
          events.map((event, index) => (
            <TouchableOpacity
              key={event._id || index}
              style={{
                backgroundColor: '#1c1c1c',
                borderRadius: 16,
                marginBottom: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#374151'
              }}
            >
              {/* Event Image */}
              <View style={{ 
                height: 160,
                position: 'relative'
              }}>
                <Image 
                  source={{ uri: getEventImage(event, index) }}
                  style={{ 
                    width: '100%', 
                    height: '100%'
                  }}
                  onError={() => {
                    // Fallback will be handled by getEventImage function
                  }}
                />
                
                {/* Gradient Overlay */}
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.4)'
                }} />
                
                {/* Date Badge */}
                <View style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12
                }}>
                  <Text style={{
                    color: '#1f2937',
                    fontSize: 12,
                    fontWeight: 'bold',
                    fontFamily: 'System'
                  }}>
                    {formatEventDate(event.event_datetime)}
                  </Text>
                </View>

                {/* Attendees Count */}
                <View style={{
                  position: 'absolute',
                  bottom: 12,
                  right: 12,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Users size={12} color="#ffffff" />
                  <Text style={{
                    color: '#ffffff',
                    fontSize: 12,
                    fontFamily: 'System'
                  }}>
                    {event.attendees_count || 0}
                  </Text>
                </View>
              </View>

              {/* Event Content */}
              <View style={{
                backgroundColor: '#1c1c1c',
                padding: 16,
                flex: 1,
                justifyContent: 'space-between'
              }}>
                <View style={{ gap: 8 }}>
                  {/* Event Title */}
                  <Text style={{
                    color: '#ffffff',
                    fontSize: 16,
                    fontWeight: 'bold',
                    fontFamily: 'System'
                  }} numberOfLines={1}>
                    {event.title || 'Untitled Event'}
                  </Text>

                  {/* Event Description */}
                  {event.description && (
                    <Text style={{
                      color: '#d1d5db',
                      fontSize: 12,
                      fontFamily: 'System',
                      lineHeight: 16
                    }} numberOfLines={2}>
                      {event.description}
                    </Text>
                  )}

                  {/* Event Details */}
                  <View style={{ gap: 4 }}>
                    {/* Time */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <Clock size={12} color="#9ca3af" />
                      <Text style={{
                        color: '#9ca3af',
                        fontSize: 12,
                        fontFamily: 'System'
                      }}>
                        {formatEventTime(event.event_datetime)}
                      </Text>
                    </View>

                    {/* Location */}
                    {(event.location_title || event.location) && (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <MapPin size={12} color="#9ca3af" />
                        <Text style={{
                          color: '#9ca3af',
                          fontSize: 12,
                          fontFamily: 'System',
                          flex: 1
                        }} numberOfLines={1}>
                          {event.location_title || event.location}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Event Footer */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: '#374151',
                  marginTop: 8
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <Image
                      source={{ 
                        uri: getProfilePictureUrl(event.profile_picture) || getDefaultProfilePicture() 
                      }}
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#374151'
                      }}
                      onError={(e) => {
                        // Handle error - could set a fallback
                      }}
                    />
                    <Text style={{
                      color: '#d1d5db',
                      fontSize: 12,
                      fontWeight: '500',
                      fontFamily: 'System'
                    }}>
                      {event.username || 'Unknown'}
                    </Text>
                  </View>

                  {/* Like Button */}
                  <TouchableOpacity
                    onPress={() => {
                      // Add like functionality here
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12
                    }}
                  >
                    <Heart size={12} color="#9ca3af" />
                    <Text style={{
                      color: '#9ca3af',
                      fontSize: 12,
                      fontFamily: 'System'
                    }}>
                      {event.likes_count || 0}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Click to view details indicator */}
                <View style={{
                  alignItems: 'center',
                  marginTop: 4
                }}>
                  <View style={{
                    backgroundColor: 'rgba(28,28,28,0.5)',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12
                  }}>
                    <Text style={{
                      color: '#9ca3af',
                      fontSize: 12,
                      fontFamily: 'System'
                    }}>
                      Tap to view details
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}