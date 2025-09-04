import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import { MapPin, Navigation, Users, Calendar, Compass } from 'lucide-react-native';
import { API_BASE_URL } from '../../src/config/api';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

export default function Waypoint() {
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

  const fetchNearbyEvents = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      setError('');
      
      const url = `${API_BASE_URL}/events?limit=20&nearby=true`;
      console.log('🔍 Fetching nearby events from:', url);
      
      const headers = await getAuthHeaders();
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });
      
      console.log('📡 Waypoint response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          setEvents([]);
          return;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch events (${response.status})`);
      }
      
      const data = await response.json();
      console.log('📊 Waypoint data received:', data);
      setEvents(data.events || data || []);
    } catch (err) {
      console.error('❌ Error fetching nearby events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNearbyEvents();
  }, []);

  const refreshEvents = () => {
    setRefreshing(true);
    fetchNearbyEvents();
  };

  const formatEventDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays > 0 && diffDays < 7) return `In ${diffDays} days`;
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
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

  const getDistanceText = (event) => {
    // Placeholder - in a real app you'd calculate distance based on user location
    const distances = ['0.5 mi', '1.2 mi', '2.3 mi', '3.8 mi', '5.1 mi'];
    return distances[Math.floor(Math.random() * distances.length)];
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
        }}>Finding nearby events...</Text>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Compass size={28} color="#f97316" />
          <Text style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: '#ffffff',
            marginLeft: 12,
            fontFamily: 'System'
          }}>
            Waypoint
          </Text>
        </View>
        <Text style={{
          fontSize: 16,
          color: '#9ca3af',
          fontFamily: 'System'
        }}>
          Discover events and places near you
        </Text>
      </View>

      {/* Location Quick Actions */}
      <View style={{
        paddingHorizontal: 20,
        paddingBottom: 16
      }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12 }}
        >
          <TouchableOpacity style={{
            backgroundColor: '#1f2937',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#f97316'
          }}>
            <MapPin size={16} color="#f97316" />
            <Text style={{
              color: '#f97316',
              marginLeft: 6,
              fontWeight: 'bold',
              fontFamily: 'System'
            }}>Nearby</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{
            backgroundColor: '#1f2937',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Navigation size={16} color="#9ca3af" />
            <Text style={{
              color: '#9ca3af',
              marginLeft: 6,
              fontFamily: 'System'
            }}>Trending</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{
            backgroundColor: '#1f2937',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Users size={16} color="#9ca3af" />
            <Text style={{
              color: '#9ca3af',
              marginLeft: 6,
              fontFamily: 'System'
            }}>Popular</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
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
            <MapPin size={48} color="#9ca3af" />
            <Text style={{ 
              color: '#9ca3af',
              fontFamily: 'System',
              marginTop: 16,
              fontSize: 16
            }}>No nearby events found</Text>
            <Text style={{ 
              color: '#6b7280',
              fontFamily: 'System',
              marginTop: 8,
              textAlign: 'center'
            }}>Try enabling location services for better results</Text>
          </View>
        ) : (
          <View>
            {/* Map Placeholder */}
            <View style={{
              backgroundColor: '#1f2937',
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 120,
              borderWidth: 2,
              borderColor: '#374151',
              borderStyle: 'dashed'
            }}>
              <MapPin size={32} color="#f97316" />
              <Text style={{
                color: '#9ca3af',
                fontFamily: 'System',
                marginTop: 8,
                textAlign: 'center'
              }}>
                Map View Coming Soon
              </Text>
              <Text style={{
                color: '#6b7280',
                fontFamily: 'System',
                fontSize: 12,
                marginTop: 4,
                textAlign: 'center'
              }}>
                Interactive map with event locations
              </Text>
            </View>

            {/* Events List */}
            <Text style={{
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 12,
              fontFamily: 'System'
            }}>
              Nearby Events ({events.length})
            </Text>
            
            {events.map((event, index) => (
              <TouchableOpacity
                key={event._id || index}
                style={{
                  backgroundColor: '#1f2937',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  flexDirection: 'row'
                }}
              >
                {/* Event Info */}
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: '#ffffff',
                    fontSize: 16,
                    fontWeight: 'bold',
                    marginBottom: 6,
                    fontFamily: 'System'
                  }}>
                    {event.title || 'Untitled Event'}
                  </Text>

                  <View style={{ gap: 4 }}>
                    {/* Date & Time */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <Calendar size={14} color="#f97316" />
                      <Text style={{
                        color: '#d1d5db',
                        fontSize: 13,
                        fontFamily: 'System'
                      }}>
                        {formatEventDate(event.event_datetime)} • {formatEventTime(event.event_datetime)}
                      </Text>
                    </View>

                    {/* Location with Distance */}
                    {(event.location_title || event.location) && (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <MapPin size={14} color="#f97316" />
                        <Text style={{
                          color: '#d1d5db',
                          fontSize: 13,
                          fontFamily: 'System',
                          flex: 1
                        }} numberOfLines={1}>
                          {event.location_title || event.location} • {getDistanceText(event)}
                        </Text>
                      </View>
                    )}

                    {/* Attendees */}
                    {event.attendees_count !== undefined && (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <Users size={14} color="#f97316" />
                        <Text style={{
                          color: '#d1d5db',
                          fontSize: 13,
                          fontFamily: 'System'
                        }}>
                          {event.attendees_count} attending
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Distance Badge */}
                <View style={{
                  backgroundColor: '#f97316',
                  borderRadius: 16,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  alignSelf: 'flex-start'
                }}>
                  <Text style={{
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 'bold',
                    fontFamily: 'System'
                  }}>
                    {getDistanceText(event)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}