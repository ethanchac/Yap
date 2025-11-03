import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { Calendar, MapPin, Users, Clock, ExternalLink, Loader2 } from 'lucide-react-native';
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
      'Content-Type': 'application/json',
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
      
  // Sensitive logging removed: do not log API URLs, headers or user IDs
  const headers = await getAuthHeaders();
      
      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });
      
  // Response status logging removed for privacy
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('📡 ProfileEvents - 404: No events found, setting empty array');
          setEvents([]);
          return;
        }
        
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = { error: `HTTP ${response.status} - ${response.statusText}` };
        }
        
        throw new Error(errorData.error || `Failed to fetch events (${response.status})`);
      }
      
  const data = await response.json();
      
      setEvents(data.events || []);
    } catch (err) {
      console.error('❌ ProfileEvents Error fetching events:', err);
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

  // Get time status (matching frontend logic)
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

  // Get event icon (matching frontend)
  const getEventIcon = (index) => {
    const icons = ['🎉', '🎵', '🎨', '🏃', '🍕', '📚', '🎬', '🎪', '🎯', '🎮'];
    return icons[index % icons.length];
  };

  if (loading) {
    return (
      <View>
        {/* Header outside the container */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Calendar size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#ffffff',
              fontFamily: 'System'
            }}>
              Events
            </Text>
          </View>
        </View>
        
        {/* Content container */}
        <View style={{
          backgroundColor: '#171717',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24
        }}>
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <Loader2 size={20} color="#9ca3af" />
              <Text style={{
                color: '#9ca3af',
                marginLeft: 8,
                fontFamily: 'System'
              }}>
                Loading events...
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View>
        {/* Header outside the container */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Calendar size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#ffffff',
              fontFamily: 'System'
            }}>
              Events
            </Text>
          </View>
        </View>
        
        {/* Content container */}
        <View style={{
          backgroundColor: '#171717',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24
        }}>
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Text style={{
              color: '#fca5a5',
              fontSize: 14,
              fontFamily: 'System',
              marginBottom: 16
            }}>
              Error: {error}
            </Text>
            <TouchableOpacity 
              onPress={fetchEvents}
              style={{
                backgroundColor: '#3b82f6',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8
              }}
            >
              <Text style={{
                color: '#ffffff',
                fontWeight: 'bold',
                fontFamily: 'System'
              }}>
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View>
        {/* Header outside the container */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Calendar size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#ffffff',
              fontFamily: 'System'
            }}>
              Events
            </Text>
          </View>
        </View>
        
        {/* Content container */}
        <View style={{
          backgroundColor: '#171717',
          borderRadius: 12,
          padding: 24,
          marginBottom: 24
        }}>
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Users size={48} color="#9ca3af" style={{ 
              opacity: 0.5,
              marginBottom: 12 
            }} />
            <Text style={{
              color: '#9ca3af',
              fontSize: 14,
              fontFamily: 'System',
              textAlign: 'center'
            }}>
              {isOwnProfile 
                ? "You haven't signed up for any events yet." 
                : "This user hasn't signed up for any events yet."
              }
            </Text>
            {isOwnProfile && (
              <Text style={{
                color: '#6b7280',
                fontSize: 12,
                fontFamily: 'System',
                textAlign: 'center',
                marginTop: 8
              }}>
                Check out the Events section on the home page to discover events!
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View>
      {/* Header outside the container */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          <Calendar size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: '#ffffff',
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
        </View>
        {events.length > 0 && (
          <TouchableOpacity onPress={fetchEvents}>
            <Text style={{
              color: '#3b82f6',
              fontSize: 14,
              fontWeight: '600',
              fontFamily: 'System'
            }}>
              Refresh
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content container */}
      <View style={{
        backgroundColor: '#171717',
        borderRadius: 12,
        padding: 24,
        marginBottom: 24
      }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ gap: 12 }}>
            {events.map((event, index) => {
              const timeStatus = getTimeStatus(event.event_datetime);
              return (
                <Pressable
                  key={event._id || index}
                  style={({ pressed }) => ({
                    backgroundColor: '#1a1a1a',
                    borderRadius: 12,
                    padding: 16,
                    transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
                    shadowColor: '#000',
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                  })}
                >
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12
                  }}>
                    {/* Event Icon */}
                    <Text style={{
                      fontSize: 24,
                      lineHeight: 28
                    }}>
                      {getEventIcon(index)}
                    </Text>

                    {/* Event Content */}
                    <View style={{ flex: 1 }}>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: 8
                      }}>
                        <Text style={{
                          color: '#ffffff',
                          fontSize: 16,
                          fontWeight: '600',
                          fontFamily: 'System',
                          flex: 1,
                          marginRight: 8
                        }} numberOfLines={2}>
                          {event.title}
                        </Text>
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: timeStatus.color,
                          fontFamily: 'System'
                        }}>
                          {timeStatus.text}
                        </Text>
                      </View>

                      {event.description && (
                        <Text style={{
                          color: '#9ca3af',
                          fontSize: 12,
                          fontFamily: 'System',
                          marginBottom: 12,
                          lineHeight: 16
                        }} numberOfLines={2}>
                          {event.description}
                        </Text>
                      )}

                      {/* Event Details */}
                      <View style={{ gap: 4 }}>
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}>
                          <Calendar size={12} color="#9ca3af" />
                          <Text style={{
                            color: '#9ca3af',
                            fontSize: 12,
                            fontFamily: 'System',
                            marginLeft: 4
                          }}>
                            {formatEventDate(event.event_datetime)}
                          </Text>
                          <Clock size={12} color="#9ca3af" style={{ marginLeft: 8 }} />
                          <Text style={{
                            color: '#9ca3af',
                            fontSize: 12,
                            fontFamily: 'System',
                            marginLeft: 4
                          }}>
                            {formatEventTime(event.event_datetime)}
                          </Text>
                        </View>

                        {(event.location_title || event.location) && (
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center'
                          }}>
                            <MapPin size={12} color="#9ca3af" />
                            <Text style={{
                              color: '#9ca3af',
                              fontSize: 12,
                              fontFamily: 'System',
                              marginLeft: 4,
                              flex: 1
                            }} numberOfLines={1}>
                              {event.location_title || event.location}
                            </Text>
                          </View>
                        )}

                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}>
                          <Users size={12} color="#9ca3af" />
                          <Text style={{
                            color: '#9ca3af',
                            fontSize: 12,
                            fontFamily: 'System',
                            marginLeft: 4
                          }}>
                            {event.attendees_count || 0} attending
                            {event.max_attendees && (
                              <Text style={{ color: '#6b7280' }}>
                                {' / '}{event.max_attendees}
                              </Text>
                            )}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* External Link Icon */}
                    <ExternalLink size={16} color="#6b7280" />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

export default ProfileEvents;