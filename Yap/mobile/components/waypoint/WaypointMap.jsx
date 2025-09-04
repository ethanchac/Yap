import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Dimensions,
  Platform
} from 'react-native';
import { 
  MapPin, 
  Users, 
  Heart, 
  Bookmark, 
  Trash2,
  Target,
  ChevronLeft,
  ChevronRight
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

// Interactive mobile waypoint map component using Leaflet via WebView
function WaypointMap({ 
  waypoints, 
  placementMode, 
  refreshing, 
  onMapClick, 
  onDeleteWaypoint, 
  onLikeWaypoint,
  onBookmarkWaypoint,
  onJoinEvent,
  getCurrentUser,
  targetWaypoint = null,
  shouldOpenPopup = false,
  isNavigatingSaved = false,
  currentSavedIndex = -1,
  savedWaypointsCount = 0,
  onPreviousSaved,
  onNextSaved
}) {
  const [selectedWaypoint, setSelectedWaypoint] = useState(null);
  const mapRef = useRef(null);
  const scrollViewRef = useRef(null);

  // TMU Campus coordinates (Toronto Metropolitan University)
  const TMU_COORDS = [43.6577, -79.3788];
  const ZOOM_LEVEL = 16;

  // Get current user ID
  const getCurrentUserId = async () => {
    try {
      const { SecureStore } = await import('expo-secure-store');
      const token = await SecureStore.getItemAsync('token');
      if (!token) return null;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user_id || payload.id || null;
    } catch (err) {
      console.error('Error getting user ID:', err);
      return null;
    }
  };

  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    getCurrentUserId().then(setCurrentUserId);
  }, []);

  // Handle target waypoint navigation
  useEffect(() => {
    if (targetWaypoint && mapRef.current) {
      // Send message to WebView to navigate to waypoint
      const message = {
        type: 'navigateToWaypoint',
        waypoint: targetWaypoint,
        shouldOpenPopup: shouldOpenPopup
      };
      mapRef.current.postMessage(JSON.stringify(message));
      setSelectedWaypoint(targetWaypoint);
    }
  }, [targetWaypoint, shouldOpenPopup]);

  // Create the Leaflet map HTML (exactly like frontend)
  const createMapHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Waypoint Map</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body { margin: 0; padding: 0; font-family: 'Albert Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
        #map { height: 100vh; width: 100vw; background: #171717; }
        .custom-waypoint-marker { background: transparent !important; border: none !important; }
        .campus-marker { background: transparent !important; border: none !important; }
        .slc-marker { background: transparent !important; border: none !important; }
        .leaflet-popup-content-wrapper { background: #1f2937; color: white; border-radius: 8px; }
        .leaflet-popup-content { margin: 12px; color: white; font-family: 'Albert Sans', sans-serif; }
        .leaflet-popup-tip { background: #1f2937; }
        .leaflet-control-attribution { display: none; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // Initialize map
        const map = L.map('map', {
            center: [${TMU_COORDS[0]}, ${TMU_COORDS[1]}],
            zoom: ${ZOOM_LEVEL},
            zoomControl: true,
            scrollWheelZoom: true
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);

        // Icon creation functions (same as frontend)
        function createCustomIcon(type) {
            const colors = {
                'food': '#f59e0b',
                'study': '#3b82f6', 
                'group': '#10b981',
                'social': '#8b5cf6',
                'event': '#ef4444',
                'other': '#6b7280'
            };
            
            const emojis = {
                'food': '🍕',
                'study': '📚',
                'group': '👥', 
                'social': '🎉',
                'event': '📅',
                'other': '📍'
            };

            return L.divIcon({
                className: 'custom-waypoint-marker',
                html: \`
                    <div style="
                        background-color: \${colors[type] || colors.other};
                        width: 30px;
                        height: 30px;
                        border-radius: 50% 50% 50% 0;
                        border: 3px solid white;
                        transform: rotate(-45deg);
                        box-shadow: 0 3px 6px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                    ">
                        <span style="
                            transform: rotate(45deg); 
                            font-size: 14px;
                            line-height: 1;
                        ">\${emojis[type] || emojis.other}</span>
                    </div>
                \`,
                iconSize: [30, 30],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30]
            });
        }

        // Campus marker
        const campusIcon = L.divIcon({
            className: 'campus-marker',
            html: \`
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <div style="
                        background-color: #dc2626;
                        width: 45px; height: 45px;
                        border-radius: 50%;
                        border: 4px solid white;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.4);
                        display: flex; align-items: center; justify-content: center;
                        font-size: 20px; margin-bottom: 2px;
                    ">🏫</div>
                    <div style="
                        background-color: rgba(220, 38, 38, 0.95); color: white;
                        padding: 4px 8px; border-radius: 12px;
                        font-size: 12px; font-weight: bold;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        border: 2px solid white;
                    ">TMU Campus</div>
                </div>
            \`,
            iconSize: [60, 70],
            iconAnchor: [30, 35],
            popupAnchor: [0, -35]
        });

        // SLC marker
        const slcIcon = L.divIcon({
            className: 'slc-marker',
            html: \`
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <div style="
                        background-color: #2563eb;
                        width: 38px; height: 38px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
                        display: flex; align-items: center; justify-content: center;
                        font-size: 18px; margin-bottom: 2px;
                    ">📚</div>
                    <div style="
                        background-color: rgba(37, 99, 235, 0.95); color: white;
                        padding: 3px 6px; border-radius: 10px;
                        font-size: 11px; font-weight: bold;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        border: 2px solid white;
                    ">SLC</div>
                </div>
            \`,
            iconSize: [55, 60],
            iconAnchor: [27, 30],
            popupAnchor: [0, -30]
        });

        // Add campus markers
        L.marker([${TMU_COORDS[0]}, ${TMU_COORDS[1]}], {icon: campusIcon})
            .addTo(map)
            .bindPopup('<div style="text-align: center;"><h3 style="margin: 0 0 8px 0; color: white;">TMU Campus</h3><p style="margin: 0; color: #9ca3af; font-size: 14px;">Toronto Metropolitan University</p></div>');

        L.marker([43.6578, -79.3805], {icon: slcIcon})
            .addTo(map)
            .bindPopup('<div style="text-align: center;"><h3 style="margin: 0 0 8px 0; color: white;">Student Learning Centre</h3><p style="margin: 0 0 4px 0; color: #9ca3af; font-size: 14px;">📚 Study spaces, tutoring, and academic support</p><p style="margin: 0; color: #60a5fa; font-size: 12px; font-weight: bold;">SLC Building</p></div>');

        // Store waypoint markers
        let waypointMarkers = [];
        let placementMode = false;
        let targetWaypoint = null;

        // Handle map clicks
        map.on('click', function(e) {
            if (placementMode) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'mapClick',
                    lat: e.latlng.lat,
                    lng: e.latlng.lng
                }));
            }
        });

        // Update waypoints function
        function updateWaypoints(waypoints) {
            // Clear existing waypoint markers
            waypointMarkers.forEach(marker => map.removeLayer(marker));
            waypointMarkers = [];

            // Add new waypoint markers
            waypoints.forEach(waypoint => {
                const marker = L.marker(waypoint.coords, {
                    icon: createCustomIcon(waypoint.type),
                    waypointId: waypoint.id
                }).addTo(map);

                // Create popup content
                const popupContent = \`
                    <div style="min-width: 200px; color: white;">
                        <h3 style="margin: 0 0 8px 0; color: white; font-size: 16px; font-weight: bold;">
                            \${waypoint.title}
                        </h3>
                        <p style="margin: 0 0 8px 0; color: #d1d5db; font-size: 14px; line-height: 1.4;">
                            \${waypoint.description}
                        </p>
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                            <span style="color: #9ca3af; font-size: 12px;">@\${waypoint.author}</span>
                            <span style="color: #9ca3af; font-size: 12px;">\${waypoint.time}</span>
                            \${waypoint.distance_km ? \`<span style="color: #fb923c; font-size: 12px; font-weight: bold;">\${waypoint.distance_km.toFixed(1)}km away</span>\` : ''}
                        </div>
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <button onclick="handleLike('\${waypoint.id}')" style="
                                background: none; border: none; color: \${waypoint.isLiked ? '#ef4444' : '#9ca3af'};
                                cursor: pointer; display: flex; align-items: center; gap: 4px;
                            ">❤️ \${waypoint.interactions.likes}</button>
                            <button onclick="handleBookmark('\${waypoint.id}')" style="
                                background: none; border: none; color: \${waypoint.isBookmarked ? '#a855f7' : '#9ca3af'};
                                cursor: pointer; display: flex; align-items: center; gap: 4px;
                            ">🔖 \${waypoint.interactions.bookmarks}</button>
                            \${waypoint.type === 'event' && !waypoint.isOwner ? \`
                                <button onclick="handleJoinEvent('\${waypoint.id}')" style="
                                    background: \${waypoint.isAttending ? '#10b981' : '#f97316'}; 
                                    border: none; color: white; padding: 4px 8px; border-radius: 4px;
                                    cursor: pointer; font-size: 12px; font-weight: bold;
                                ">\${waypoint.isAttending ? '✅ Joined' : '🎫 Join Event'}</button>
                            \` : ''}
                            \${waypoint.isOwner ? \`
                                <button onclick="handleDelete('\${waypoint.id}', '\${waypoint.title}')" style="
                                    background: #ef4444; border: none; color: white; padding: 4px 8px; 
                                    border-radius: 4px; cursor: pointer; font-size: 12px;
                                ">🗑️ Delete</button>
                            \` : ''}
                        </div>
                    </div>
                \`;

                marker.bindPopup(popupContent);
                waypointMarkers.push(marker);
            });
        }

        // Navigation function
        function navigateToWaypoint(waypoint, shouldOpenPopup) {
            map.flyTo(waypoint.coords, 18, {
                duration: 1.0,
                easeLinearity: 0.05
            });
            
            if (shouldOpenPopup) {
                setTimeout(() => {
                    const marker = waypointMarkers.find(m => m.options.waypointId === waypoint.id);
                    if (marker) {
                        marker.openPopup();
                    }
                }, 1200);
            }
        }

        // Action handlers
        function handleLike(waypointId) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'like',
                waypointId: waypointId
            }));
        }

        function handleBookmark(waypointId) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'bookmark', 
                waypointId: waypointId
            }));
        }

        function handleJoinEvent(waypointId) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'joinEvent',
                waypointId: waypointId
            }));
        }

        function handleDelete(waypointId, title) {
            if (confirm('Are you sure you want to delete "' + title + '"?')) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'delete',
                    waypointId: waypointId,
                    title: title
                }));
            }
        }

        // Message handler
        window.addEventListener('message', function(event) {
            try {
                const data = JSON.parse(event.data);
                
                switch(data.type) {
                    case 'updateWaypoints':
                        updateWaypoints(data.waypoints);
                        break;
                    case 'setPlacementMode':
                        placementMode = data.enabled;
                        map.getContainer().style.cursor = placementMode ? 'crosshair' : 'grab';
                        break;
                    case 'navigateToWaypoint':
                        navigateToWaypoint(data.waypoint, data.shouldOpenPopup);
                        break;
                }
            } catch (e) {
                console.error('Error parsing message:', e);
            }
        });

        // Initial waypoint update
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapReady'
        }));
    </script>
</body>
</html>
    `;
  };

  const getWaypointIcon = (type) => {
    switch (type) {
      case 'food': return '🍕';
      case 'study': return '📚';
      case 'group': return '👥';
      case 'social': return '🎉';
      case 'event': return '📅';
      case 'other': return '📍';
      default: return '📍';
    }
  };

  const getWaypointColor = (type) => {
    switch (type) {
      case 'food': return '#f97316';
      case 'study': return '#3b82f6';
      case 'group': return '#10b981';
      case 'social': return '#8b5cf6';
      case 'event': return '#ef4444';
      case 'other': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const handleWaypointPress = (waypoint) => {
    setSelectedWaypoint(selectedWaypoint?.id === waypoint.id ? null : waypoint);
  };

  const handleMapPress = (event) => {
    if (placementMode && event.nativeEvent) {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      onMapClick({ lat: latitude, lng: longitude });
    } else {
      setSelectedWaypoint(null);
    }
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
      return 'Date unknown';
    }
  };

  const renderWaypointItem = (waypoint) => {
    const isSelected = selectedWaypoint?.id === waypoint.id;
    const isOwner = getCurrentUser() === waypoint.author;
    const isEventWaypoint = waypoint.type === 'event' || waypoint.title.startsWith('📅');
    
    return (
      <TouchableOpacity
        key={waypoint.id}
        onPress={() => handleWaypointPress(waypoint)}
        style={{
          backgroundColor: isSelected ? '#1f2937' : '#171717',
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderLeftWidth: 4,
          borderLeftColor: getWaypointColor(waypoint.type),
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? '#f97316' : '#374151'
        }}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 8
        }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>
                {getWaypointIcon(waypoint.type)}
              </Text>
              <Text style={{
                color: '#ffffff',
                fontSize: 16,
                fontWeight: 'bold',
                flex: 1,
                fontFamily: 'System'
              }}>
                {waypoint.title}
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{
                color: '#9ca3af',
                fontSize: 12,
                fontFamily: 'System'
              }}>
                @{waypoint.author}
              </Text>
              <Text style={{
                color: '#9ca3af',
                fontSize: 12,
                fontFamily: 'System'
              }}>
                {waypoint.time}
              </Text>
              {waypoint.distance_km && (
                <Text style={{
                  color: '#fb923c',
                  fontSize: 12,
                  fontWeight: 'bold',
                  fontFamily: 'System'
                }}>
                  {waypoint.distance_km.toFixed(1)}km away
                </Text>
              )}
            </View>
          </View>
          
          {isOwner && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'Delete Waypoint',
                  `Are you sure you want to delete "${waypoint.title}"?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Delete', 
                      style: 'destructive',
                      onPress: () => onDeleteWaypoint(waypoint.id, waypoint.title)
                    }
                  ]
                );
              }}
              style={{ padding: 8 }}
            >
              <Trash2 size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>

        {/* Description */}
        <Text style={{
          color: '#d1d5db',
          fontSize: 14,
          lineHeight: 20,
          marginBottom: 12,
          fontFamily: 'System'
        }}>
          {waypoint.description}
        </Text>

        {/* Event Info */}
        {isEventWaypoint && waypoint.attendeesCount !== undefined && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
            gap: 16
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Users size={16} color="#fb923c" />
              <Text style={{
                color: '#d1d5db',
                fontSize: 14,
                fontFamily: 'System'
              }}>
                {waypoint.attendeesCount} attending
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <TouchableOpacity
              onPress={() => onLikeWaypoint(waypoint.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Heart 
                size={18} 
                color={waypoint.isLiked ? '#ef4444' : '#9ca3af'}
                fill={waypoint.isLiked ? '#ef4444' : 'none'}
              />
              <Text style={{
                color: '#9ca3af',
                fontSize: 14,
                fontWeight: 'bold',
                fontFamily: 'System'
              }}>
                {waypoint.interactions.likes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onBookmarkWaypoint(waypoint.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Bookmark 
                size={18} 
                color={waypoint.isBookmarked ? '#a855f7' : '#9ca3af'}
                fill={waypoint.isBookmarked ? '#a855f7' : 'none'}
              />
              <Text style={{
                color: '#9ca3af',
                fontSize: 14,
                fontWeight: 'bold',
                fontFamily: 'System'
              }}>
                {waypoint.interactions.bookmarks}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Event Join Button */}
          {isEventWaypoint && !isOwner && (
            <TouchableOpacity
              onPress={() => onJoinEvent(waypoint)}
              style={{
                backgroundColor: waypoint.isAttending ? '#10b981' : '#f97316',
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 6
              }}
            >
              <Text style={{
                color: 'white',
                fontSize: 12,
                fontWeight: 'bold',
                fontFamily: 'System'
              }}>
                {waypoint.isAttending ? '✅ Joined' : '🎫 Join Event'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Handle messages from WebView
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'mapReady':
          // Send initial waypoints and placement mode
          if (mapRef.current) {
            mapRef.current.postMessage(JSON.stringify({
              type: 'updateWaypoints',
              waypoints: waypoints
            }));
            mapRef.current.postMessage(JSON.stringify({
              type: 'setPlacementMode',
              enabled: placementMode
            }));
          }
          break;
          
        case 'mapClick':
          handleMapPress({ nativeEvent: { coordinate: { latitude: data.lat, longitude: data.lng } } });
          break;
          
        case 'like':
          onLikeWaypoint(data.waypointId);
          break;
          
        case 'bookmark':
          onBookmarkWaypoint(data.waypointId);
          break;
          
        case 'joinEvent':
          const waypoint = waypoints.find(w => w.id === data.waypointId);
          if (waypoint) {
            onJoinEvent(waypoint);
          }
          break;
          
        case 'delete':
          onDeleteWaypoint(data.waypointId, data.title);
          break;
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  // Update waypoints in WebView when they change
  useEffect(() => {
    if (mapRef.current && waypoints.length >= 0) {
      mapRef.current.postMessage(JSON.stringify({
        type: 'updateWaypoints',
        waypoints: waypoints
      }));
    }
  }, [waypoints]);

  // Update placement mode in WebView
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.postMessage(JSON.stringify({
        type: 'setPlacementMode',
        enabled: placementMode
      }));
    }
  }, [placementMode]);

  return (
    <View style={{ flex: 1 }}>
      {/* Interactive Leaflet Map */}
      <View style={{
        height: 300,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: placementMode ? 2 : 1,
        borderColor: placementMode ? '#f97316' : '#374151'
      }}>
        <WebView
          ref={mapRef}
          source={{ html: createMapHTML() }}
          style={{ flex: 1 }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          bounces={false}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          renderLoading={() => (
            <View style={{
              flex: 1,
              backgroundColor: '#171717',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MapPin size={48} color="#f97316" />
              <Text style={{
                color: '#9ca3af',
                marginTop: 12,
                fontFamily: 'System'
              }}>
                Loading interactive map...
              </Text>
            </View>
          )}
        />
        
        {/* Placement Mode Overlay */}
        {placementMode && (
          <View style={{
            position: 'absolute',
            top: 10,
            left: 10,
            right: 10,
            backgroundColor: 'rgba(249, 115, 22, 0.9)',
            borderRadius: 8,
            padding: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Target size={16} color="white" />
            <Text style={{
              color: 'white',
              marginLeft: 8,
              fontWeight: 'bold',
              fontSize: 14,
              fontFamily: 'System'
            }}>
              Tap map to place waypoint
            </Text>
          </View>
        )}
      </View>

      {/* Navigation Controls for Saved Waypoints */}
      {isNavigatingSaved && (
        <View style={{
          backgroundColor: '#7c3aed',
          borderRadius: 12,
          marginHorizontal: 16,
          marginBottom: 16,
          padding: 16
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <TouchableOpacity
              onPress={onPreviousSaved}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 20,
                padding: 8
              }}
            >
              <ChevronLeft size={20} color="white" />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={{
                color: 'white',
                fontWeight: 'bold',
                fontSize: 16,
                fontFamily: 'System'
              }}>
                🔖 Saved Waypoints
              </Text>
              <Text style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 14,
                fontFamily: 'System'
              }}>
                {currentSavedIndex + 1} of {savedWaypointsCount}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onNextSaved}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 20,
                padding: 8
              }}
            >
              <ChevronRight size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Waypoints List */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16
        }}>
          <Text style={{
            color: '#ffffff',
            fontSize: 18,
            fontWeight: 'bold',
            fontFamily: 'System'
          }}>
            Active Waypoints ({waypoints.length})
          </Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {/* handled by parent */}}
              colors={['#f97316']}
              tintColor="#f97316"
            />
          }
        >
          {waypoints.length === 0 ? (
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
              }}>
                No waypoints found
              </Text>
              <Text style={{
                color: '#6b7280',
                fontFamily: 'System',
                marginTop: 8,
                textAlign: 'center'
              }}>
                Be the first to add a waypoint to the map
              </Text>
            </View>
          ) : (
            waypoints.map(renderWaypointItem)
          )}
        </ScrollView>
      </View>
    </View>
  );
}

export default WaypointMap;