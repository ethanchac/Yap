import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import WaypointHeader from '../../components/waypoint/WaypointHeader';
import WaypointModal from '../../components/waypoint/WaypointModal';
import WaypointMap from '../../components/waypoint/WaypointMap';
import { API_BASE_URL } from '../../src/config/api';
import * as SecureStore from 'expo-secure-store';

export default function Waypoint() {
  const [waypoints, setWaypoints] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPinLocation, setNewPinLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [placementMode, setPlacementMode] = useState(false);
  const [targetWaypoint, setTargetWaypoint] = useState(null);
  const [shouldOpenPopup, setShouldOpenPopup] = useState(false);
  
  // Saved waypoints navigation state
  const [savedWaypoints, setSavedWaypoints] = useState([]);
  const [currentSavedIndex, setCurrentSavedIndex] = useState(-1);
  const [isNavigatingSaved, setIsNavigatingSaved] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Get auth headers
  const getAuthHeaders = async () => {
    const token = await SecureStore.getItemAsync('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Get user's ObjectId directly from JWT token
  const getCurrentUserId = async () => {
    const token = await SecureStore.getItemAsync('token');
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user_id || payload.id || null;
    } catch (err) {
      console.error('Error decoding token:', err);
      return null;
    }
  };

  // Get current username
  const getCurrentUser = async () => {
    const token = await SecureStore.getItemAsync('token');
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.username;
    } catch (err) {
      console.error('Error decoding token:', err);
      return null;
    }
  };

  // Fetch waypoints from API
  const fetchWaypoints = async () => {
    try {
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/waypoint/campus/tmu?radius=2`, {
        method: 'GET',
        headers: await getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch waypoints');
      }

      const data = await response.json();
      
      // Fetch events data for event waypoints
      const currentUsername = await getCurrentUser();
      const currentUserId = await getCurrentUserId();
      let eventsData = null;
      
      const hasEventWaypoints = data.waypoints.some(w => w.type === 'event');
      if (hasEventWaypoints && currentUserId) {
        try {
          const eventsResponse = await fetch(`${API_BASE_URL}/events/feed?limit=100&include_past=false`, {
            headers: await getAuthHeaders()
          });
          if (eventsResponse.ok) {
            eventsData = await eventsResponse.json();
          }
        } catch (error) {
          console.warn('Error fetching events for attendance info:', error);
        }
      }

      const transformedWaypoints = await Promise.all(data.waypoints.map(async waypoint => {
        let isAttending = false;
        let attendeesCount = 0;
        
        // For event waypoints, get attendance information
        if (waypoint.type === 'event' && currentUserId && eventsData) {
          try {
            const eventTitle = waypoint.title.replace(/^📅\s*/, '');
            const matchingEvent = eventsData.events?.find(event => {
              const titleMatch = event.title.toLowerCase().trim() === eventTitle.toLowerCase().trim();
              let coordMatch = false;
              if (event.latitude !== null && event.latitude !== undefined && 
                  event.longitude !== null && event.longitude !== undefined) {
                const latDiff = Math.abs(waypoint.latitude - event.latitude);
                const lngDiff = Math.abs(waypoint.longitude - event.longitude);
                coordMatch = latDiff < 0.0005 && lngDiff < 0.0005;
              }
              return titleMatch && coordMatch;
            });
            
            if (matchingEvent) {
              attendeesCount = matchingEvent.attendees_count || 0;
              
              const attendanceResponse = await fetch(`${API_BASE_URL}/events/${matchingEvent._id}/attend-status`, {
                headers: await getAuthHeaders()
              });
              if (attendanceResponse.ok) {
                const attendanceData = await attendanceResponse.json();
                isAttending = attendanceData.attending || false;
              }
            }
          } catch (error) {
            console.warn('Error fetching attendance for waypoint:', waypoint.title, error);
          }
        }
        
        return {
          id: waypoint._id,
          coords: [waypoint.latitude, waypoint.longitude],
          title: waypoint.title,
          description: waypoint.description,
          type: waypoint.type,
          time: waypoint.time_ago || 'recently',
          author: waypoint.username,
          active: true,
          interactions: waypoint.interactions || { likes: 0, bookmarks: 0 },
          distance_km: waypoint.distance_km,
          isLiked: currentUserId ? waypoint.liked_users?.includes(currentUserId) : false,
          isBookmarked: currentUserId ? waypoint.bookmarked_users?.includes(currentUserId) : false,
          isOwner: currentUsername && waypoint.username === currentUsername,
          liked_users: waypoint.liked_users || [],
          bookmarked_users: waypoint.bookmarked_users || [],
          isAttending: isAttending,
          attendeesCount: attendeesCount
        };
      }));

      setWaypoints(transformedWaypoints);
      
    } catch (err) {
      console.error('Error fetching waypoints:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Create waypoint via API
  const createWaypoint = async (waypointData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/waypoint/create`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          title: waypointData.title,
          description: waypointData.description,
          type: waypointData.type,
          latitude: newPinLocation.lat,
          longitude: newPinLocation.lng,
          expires_in_hours: 24 * 7 // 1 week
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create waypoint');
      }

      fetchWaypoints();
      setShowCreateModal(false);
      setNewPinLocation(null);
      setPlacementMode(false);

    } catch (err) {
      console.error('Error creating waypoint:', err);
      Alert.alert('Error', err.message);
    }
  };

  // Like waypoint
  const likeWaypoint = async (waypointId) => {
    try {
      const currentUserId = await getCurrentUserId();
      
      if (!currentUserId) {
        Alert.alert('Authentication Required', 'Please log in to like waypoints');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/waypoint/${waypointId}/like`, {
        method: 'POST',
        headers: await getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to like waypoint');
      }

      fetchWaypoints();

    } catch (err) {
      console.error('Error liking waypoint:', err);
      Alert.alert('Error', err.message);
    }
  };

  // Bookmark waypoint
  const bookmarkWaypoint = async (waypointId) => {
    try {
      const currentUserId = await getCurrentUserId();
      
      if (!currentUserId) {
        Alert.alert('Authentication Required', 'Please log in to bookmark waypoints');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/waypoint/${waypointId}/bookmark`, {
        method: 'POST',
        headers: await getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to bookmark waypoint');
      }

      fetchWaypoints();

    } catch (err) {
      console.error('Error bookmarking waypoint:', err);
      Alert.alert('Error', err.message);
    }
  };

  // Delete waypoint
  const deleteWaypoint = async (waypointId, waypointTitle) => {
    try {
      const response = await fetch(`${API_BASE_URL}/waypoint/${waypointId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete waypoint');
      }

      fetchWaypoints();
      Alert.alert('Success', 'Waypoint deleted successfully');

    } catch (err) {
      console.error('Error deleting waypoint:', err);
      Alert.alert('Error', err.message);
    }
  };

  // Join event from waypoint
  const joinEventFromWaypoint = async (waypoint) => {
    try {
      if (!waypoint || waypoint.type !== 'event') {
        Alert.alert('Error', 'This is not an event waypoint');
        return;
      }

      const eventTitle = waypoint.title.replace(/^📅\s*/, '');
      
      const eventsResponse = await fetch(`${API_BASE_URL}/events/feed?limit=100&include_past=false`, {
        headers: await getAuthHeaders()
      });

      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch events');
      }

      const eventsData = await eventsResponse.json();
      const events = eventsData.events || [];

      const matchingEvent = events.find(event => {
        const titleMatch = event.title.toLowerCase().trim() === eventTitle.toLowerCase().trim();
        let coordMatch = false;
        if (event.latitude !== null && event.latitude !== undefined && 
            event.longitude !== null && event.longitude !== undefined) {
          const latDiff = Math.abs(waypoint.coords[0] - event.latitude);
          const lngDiff = Math.abs(waypoint.coords[1] - event.longitude);
          coordMatch = latDiff < 0.0005 && lngDiff < 0.0005;
        }
        return titleMatch && coordMatch;
      });

      if (!matchingEvent) {
        Alert.alert('Error', 'Could not find the corresponding event');
        return;
      }

      const joinResponse = await fetch(`${API_BASE_URL}/events/${matchingEvent._id}/attend`, {
        method: 'POST',
        headers: await getAuthHeaders()
      });

      if (!joinResponse.ok) {
        const errorData = await joinResponse.json();
        throw new Error(errorData.error || 'Failed to join event');
      }

      const joinData = await joinResponse.json();
      fetchWaypoints();

      Alert.alert(
        'Success', 
        joinData.attending ? 'Successfully joined the event!' : 'You have left the event.'
      );

    } catch (err) {
      console.error('Error joining event from waypoint:', err);
      Alert.alert('Error', err.message || 'Failed to join event');
    }
  };

  // Fetch saved waypoints
  const fetchSavedWaypoints = async () => {
    try {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        Alert.alert('Authentication Required', 'Please log in to view saved waypoints');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/waypoint/my-bookmarks`, {
        method: 'GET',
        headers: await getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch saved waypoints');
      }

      const data = await response.json();
      setSavedWaypoints(data.waypoints);
      
      if (data.waypoints.length > 0) {
        setCurrentSavedIndex(0);
        setIsNavigatingSaved(true);
        navigateToSavedWaypoint(data.waypoints[0]);
      } else {
        Alert.alert('Info', 'No saved waypoints found');
      }
    } catch (err) {
      console.error('Error fetching saved waypoints:', err);
      Alert.alert('Error', err.message);
    }
  };

  // Navigate to saved waypoint
  const navigateToSavedWaypoint = (savedWaypoint) => {
    const mapWaypoint = {
      id: savedWaypoint._id,
      coords: [savedWaypoint.latitude, savedWaypoint.longitude],
      title: savedWaypoint.title,
      description: savedWaypoint.description,
      type: savedWaypoint.type,
      time: savedWaypoint.time_ago || 'recently',
      author: savedWaypoint.username,
      interactions: savedWaypoint.interactions || { likes: 0, bookmarks: 0 }
    };
    
    setTargetWaypoint(mapWaypoint);
    setShouldOpenPopup(true);
    setIsNavigating(true);
    
    setTimeout(() => {
      setShouldOpenPopup(false);
      setIsNavigating(false);
    }, 1500);
  };

  // Navigate saved waypoints
  const goToPreviousSaved = () => {
    if (savedWaypoints.length === 0 || isNavigating) return;
    
    const newIndex = currentSavedIndex > 0 ? currentSavedIndex - 1 : savedWaypoints.length - 1;
    setCurrentSavedIndex(newIndex);
    navigateToSavedWaypoint(savedWaypoints[newIndex]);
  };

  const goToNextSaved = () => {
    if (savedWaypoints.length === 0 || isNavigating) return;
    
    const newIndex = currentSavedIndex < savedWaypoints.length - 1 ? currentSavedIndex + 1 : 0;
    setCurrentSavedIndex(newIndex);
    navigateToSavedWaypoint(savedWaypoints[newIndex]);
  };

  // Manual refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchWaypoints();
  };

  // Toggle placement mode
  const togglePlacementMode = () => {
    setPlacementMode(!placementMode);
    if (placementMode) {
      setNewPinLocation(null);
      setShowCreateModal(false);
    }
  };

  // Handle map click for waypoint placement
  const handleMapClick = (latlng) => {
    setNewPinLocation(latlng);
    setShowCreateModal(true);
  };

  // Load waypoints on component mount
  useEffect(() => {
    fetchWaypoints();
  }, []);

  // Loading state
  if (loading) {
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
        }}>Loading waypoints...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      {/* Header */}
      <View style={{ paddingTop: 50 }}>
        <WaypointHeader
          placementMode={placementMode}
          onTogglePlacementMode={togglePlacementMode}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          waypointCount={waypoints.length}
          error={error}
          onClearError={() => setError(null)}
          onOpenSavedWaypoints={fetchSavedWaypoints}
          isNavigatingSaved={isNavigatingSaved}
          currentSavedIndex={currentSavedIndex}
          savedWaypointsCount={savedWaypoints.length}
          onPreviousSaved={goToPreviousSaved}
          onNextSaved={goToNextSaved}
          onExitSavedNavigation={() => {
            setIsNavigatingSaved(false);
            setSavedWaypoints([]);
            setCurrentSavedIndex(-1);
          }}
        />
      </View>

      {/* Map Container */}
      <WaypointMap
        waypoints={waypoints}
        placementMode={placementMode}
        refreshing={refreshing}
        onMapClick={handleMapClick}
        onJoinWaypoint={() => {}} // Not used in this implementation
        onDeleteWaypoint={deleteWaypoint}
        onLikeWaypoint={likeWaypoint}
        onBookmarkWaypoint={bookmarkWaypoint}
        onJoinEvent={joinEventFromWaypoint}
        getCurrentUser={getCurrentUser}
        targetWaypoint={targetWaypoint}
        shouldOpenPopup={shouldOpenPopup}
        isNavigatingSaved={isNavigatingSaved}
        currentSavedWaypoint={savedWaypoints[currentSavedIndex]}
        currentSavedIndex={currentSavedIndex}
        savedWaypointsCount={savedWaypoints.length}
        onPreviousSaved={goToPreviousSaved}
        onNextSaved={goToNextSaved}
      />

      {/* Waypoint Modal */}
      <WaypointModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewPinLocation(null);
        }}
        onSubmit={createWaypoint}
        location={newPinLocation}
      />
    </View>
  );
}