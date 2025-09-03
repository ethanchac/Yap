import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Calendar, MapPin, Users, Clock, ExternalLink } from 'lucide-react-native';
import { API_BASE_URL } from '../../src/config/api';
import * as SecureStore from 'expo-secure-store';

function ProfileEvents({ userId, isOwnProfile }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get auth headers (matching PostItem pattern)
  const getAuthHeaders = async () => {
    const token = await SecureStore.getItemAsync('token');
    return {
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Fetch events (matching frontend pattern)
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url;
      if (isOwnProfile) {
        // For own profile, get events user is attending
        url = `${API_BASE_URL}/events/attending?limit=10&include_past=true`;
      } else {
        // For other users, get events they're attending  
        url = `${API_BASE_URL}/events/user/${userId}/attending?limit=10&include_past=true`;
      }
      
      console.log('🔍 Fetching events from:', url);
      
      const headers = await getAuthHeaders();
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      console.log('📡 Events response status:', response.status, response.ok);
      
      if (!response.ok) {
        if (response.status === 404) {
          // No events found is okay
          setEvents([]);
          return;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch events (${response.status})`);
      }
      
      const data = await response.json();
      console.log('📊 Events data received:', data);
      setEvents(data.events || []);
    } catch (err) {
      console.error('❌ Error fetching events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [userId, isOwnProfile]);

  // Format date (matching frontend)
  const formatEventDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Format time (matching frontend)
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

  if (loading) {
    return (
      <View style={{
        backgroundColor: '#171717',
        borderRadius: 8,
        padding: 24
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: 16,
          fontFamily: 'System'
        }}>
          Events
        </Text>
        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
          <ActivityIndicator size="small" color="#f97316" />
          <Text style={{
            color: '#9ca3af',
            marginTop: 8,
            fontFamily: 'System'
          }}>
            Loading events...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{
        backgroundColor: '#171717',
        borderRadius: 8,
        padding: 24
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: 16,
          fontFamily: 'System'
        }}>
          Events
        </Text>
        <Text style={{
          color: '#fca5a5',
          fontSize: 14,
          fontFamily: 'System'
        }}>
          Failed to load events
        </Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={{
        backgroundColor: '#171717',
        borderRadius: 8,
        padding: 24
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: 16,
          fontFamily: 'System'
        }}>
          Events
        </Text>
        <Text style={{
          color: '#9ca3af',
          fontSize: 14,
          fontFamily: 'System'
        }}>
          {isOwnProfile ? "You haven't created any events yet." : "No events to show."}
        </Text>
      </View>
    );
  }

  return (
    <View style={{
      backgroundColor: '#171717',
      borderRadius: 8,
      padding: 24
    }}>
      <Text style={{
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 16,
        fontFamily: 'System'
      }}>
        Events {events.length > 0 && (
          <Text style={{
            fontWeight: 'normal',
            color: '#9ca3af'
          }}>
            ({events.length})
          </Text>
        )}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {events.map((event, index) => (
          <TouchableOpacity
            key={event._id || index}
            style={{
              backgroundColor: '#1f2937',
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
              borderLeftWidth: 4,
              borderLeftColor: '#f97316'
            }}
          >
            {/* Event Title */}
            <Text style={{
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 'bold',
              marginBottom: 8,
              fontFamily: 'System'
            }}>
              {event.title}
            </Text>

            {/* Event Details */}
            <View style={{ gap: 6 }}>
              {/* Date & Time */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8
              }}>
                <Calendar size={14} color="#9ca3af" />
                <Text style={{
                  color: '#9ca3af',
                  fontSize: 13,
                  fontFamily: 'System'
                }}>
                  {formatEventDate(event.event_datetime)} at {formatEventTime(event.event_datetime)}
                </Text>
              </View>

              {/* Location */}
              {(event.location_title || event.location) && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <MapPin size={14} color="#9ca3af" />
                  <Text style={{
                    color: '#9ca3af',
                    fontSize: 13,
                    fontFamily: 'System'
                  }} numberOfLines={1}>
                    {event.location_title || event.location}
                  </Text>
                </View>
              )}

              {/* Attendees */}
              {event.attendees_count !== undefined && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Users size={14} color="#9ca3af" />
                  <Text style={{
                    color: '#9ca3af',
                    fontSize: 13,
                    fontFamily: 'System'
                  }}>
                    {event.attendees_count} attending
                  </Text>
                </View>
              )}
            </View>

            {/* Event Description */}
            {event.description && (
              <Text style={{
                color: '#d1d5db',
                fontSize: 14,
                marginTop: 8,
                lineHeight: 18,
                fontFamily: 'System'
              }} numberOfLines={2}>
                {event.description}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {events.length > 3 && (
        <TouchableOpacity style={{
          marginTop: 12,
          paddingVertical: 8,
          alignItems: 'center'
        }}>
          <Text style={{
            color: '#f97316',
            fontSize: 14,
            fontWeight: 'bold',
            fontFamily: 'System'
          }}>
            View All Events
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default ProfileEvents;