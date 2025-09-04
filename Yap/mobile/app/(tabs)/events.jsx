import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Calendar, MapPin, Users } from 'lucide-react-native';
import { API_BASE_URL } from '../../src/config/api';
import * as SecureStore from 'expo-secure-store';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const getAuthHeaders = async () => {
    const token = await SecureStore.getItemAsync('token');
    return {
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const fetchEvents = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      setError('');
      
      const url = `${API_BASE_URL}/events?limit=20`;
      console.log('🔍 Fetching events from:', url);
      
      const headers = await getAuthHeaders();
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      console.log('📡 Events response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          setEvents([]);
          return;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch events (${response.status})`);
      }
      
      const data = await response.json();
      console.log('📊 Events data received:', data);
      setEvents(data.events || data || []);
    } catch (err) {
      console.error('❌ Error fetching events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
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
                backgroundColor: '#1f2937',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                borderLeftWidth: 4,
                borderLeftColor: '#f97316'
              }}
            >
              {/* Event Title */}
              <Text style={{
                color: '#ffffff',
                fontSize: 18,
                fontWeight: 'bold',
                marginBottom: 12,
                fontFamily: 'System'
              }}>
                {event.title || 'Untitled Event'}
              </Text>

              {/* Event Details */}
              <View style={{ gap: 8 }}>
                {/* Date & Time */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <Calendar size={16} color="#f97316" />
                  <Text style={{
                    color: '#d1d5db',
                    fontSize: 14,
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
                    <MapPin size={16} color="#f97316" />
                    <Text style={{
                      color: '#d1d5db',
                      fontSize: 14,
                      fontFamily: 'System',
                      flex: 1
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
                    <Users size={16} color="#f97316" />
                    <Text style={{
                      color: '#d1d5db',
                      fontSize: 14,
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
                  color: '#9ca3af',
                  fontSize: 14,
                  marginTop: 12,
                  lineHeight: 20,
                  fontFamily: 'System'
                }} numberOfLines={3}>
                  {event.description}
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}