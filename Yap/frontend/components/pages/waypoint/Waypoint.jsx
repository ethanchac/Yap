import { useState, useEffect } from 'react';
import Sidebar from '../../sidebar/Sidebar.jsx';
import WaypointModal from './WaypointModal.jsx';
import WaypointHeader from './WaypointHeader.jsx';
import WaypointMap from './WaypointMap.jsx';
import { useTheme } from '../../../contexts/ThemeContext';
import { API_BASE_URL } from '../../../services/config.js';

// Import Leaflet CSS - make sure this is in your main CSS file
import 'leaflet/dist/leaflet.css';

function Waypoint() {
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
    const [isNavigating, setIsNavigating] = useState(false); // Prevent rapid navigation
    const { isDarkMode } = useTheme();

    // TMU Campus coordinates
    const TMU_COORDS = [43.6577, -79.3788];
    const ZOOM_LEVEL = 16;

    // Get auth headers
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    };

    // Get user's ObjectId directly from JWT token
    const getCurrentUserId = () => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.user_id || null;
        } catch (err) {
            console.error('Error decoding token:', err);
            return null;
        }
    };

    // Get current username
    const getCurrentUser = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            return null;
        }
        
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
            
            // Make authenticated request to get user-specific data
            const response = await fetch(`${API_BASE_URL}/waypoint/campus/tmu?radius=2`, {
                method: 'GET',
                headers: getAuthHeaders() // Include auth headers
            });

            if (!response.ok) {
                throw new Error('Failed to fetch waypoints');
            }

            const data = await response.json();
            

            
            // Fetch events data once for all event waypoints
            const currentUsername = getCurrentUser();
            const currentUserId = getCurrentUserId();
            let eventsData = null;
            
            // Only fetch events if there are event waypoints
            const hasEventWaypoints = data.waypoints.some(w => w.type === 'event');
            if (hasEventWaypoints && currentUserId) {
                try {
                    const eventsResponse = await fetch(`${API_BASE_URL}/events/feed?limit=100&include_past=false`, {
                        headers: getAuthHeaders()
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
                
                // For event waypoints, get attendance information from pre-fetched events
                if (waypoint.type === 'event' && currentUserId && eventsData) {
                    try {
                        const eventTitle = waypoint.title.replace(/^📅\s*/, '');
                        // First try: strict matching with coordinates
                        let matchingEvent = eventsData.events?.find(event => {
                            const titleMatch = event.title.toLowerCase().trim() === eventTitle.toLowerCase().trim();
                            let coordMatch = false;
                            if (event.latitude !== null && event.latitude !== undefined && 
                                event.longitude !== null && event.longitude !== undefined) {
                                const latDiff = Math.abs(waypoint.latitude - event.latitude);
                                const lngDiff = Math.abs(waypoint.longitude - event.longitude);
                                coordMatch = latDiff < 0.0005 && lngDiff < 0.0005;
                            }
                            // Debug logging for fetchWaypoints
                            if (titleMatch) {
                                console.log(`📍 Found title match for "${eventTitle}":`, {
                                    eventCoords: [event.latitude, event.longitude],
                                    waypointCoords: [waypoint.latitude, waypoint.longitude],
                                    coordMatch,
                                    eventId: event._id,
                                    attendeesCount: event.attendees_count
                                });
                            }
                            return titleMatch && coordMatch;
                        });
                        
                        // Fallback: if no coordinate match, try title-only match for attendance
                        if (!matchingEvent) {
                            console.log(`🔄 No coordinate match for "${eventTitle}", trying title-only...`);
                            matchingEvent = eventsData.events?.find(event => {
                                const titleMatch = event.title.toLowerCase().trim() === eventTitle.toLowerCase().trim();
                                if (titleMatch) {
                                    console.log(`✅ Found title-only match for attendance: "${event.title}"`);
                                }
                                return titleMatch;
                            });
                        }
                        
                        if (matchingEvent) {
                            attendeesCount = matchingEvent.attendees_count || 0;
                            
                            // Check if current user is attending
                            const attendanceResponse = await fetch(`${API_BASE_URL}/events/${matchingEvent._id}/attend-status`, {
                                headers: getAuthHeaders()
                            });
                            if (attendanceResponse.ok) {
                                const attendanceData = await attendanceResponse.json();
                                isAttending = attendanceData.attending || false;
                                console.log(`✅ Attendance status for "${eventTitle}":`, {
                                    eventId: matchingEvent._id,
                                    isAttending,
                                    attendeesCount,
                                    attendanceData
                                });
                            } else {
                                console.warn(`❌ Failed to get attendance status for "${eventTitle}"`);
                            }
                        }
                    } catch (error) {
                        console.warn('Error fetching attendance for waypoint:', waypoint.title, error);
                    }
                }
                
                const waypointData = {
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
                    // Use backend data to determine user interaction status
                    isLiked: currentUserId ? waypoint.liked_users?.includes(currentUserId) : false,
                    isBookmarked: currentUserId ? waypoint.bookmarked_users?.includes(currentUserId) : false,
                    isOwner: currentUsername && waypoint.username === currentUsername,
                    liked_users: waypoint.liked_users || [],
                    bookmarked_users: waypoint.bookmarked_users || [],
                    // Event-specific fields
                    isAttending: isAttending,
                    attendeesCount: attendeesCount
                };
                
                // Debug logging for event waypoints
                if (waypoint.type === 'event') {
                    console.log(`🎯 Final waypoint data for "${waypoint.title}":`, {
                        isAttending: waypointData.isAttending,
                        attendeesCount: waypointData.attendeesCount,
                        isOwner: waypointData.isOwner,
                        type: waypointData.type
                    });
                }
                
                return waypointData;
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

    // Fetch saved waypoints
    const fetchSavedWaypoints = async () => {
        try {
            const currentUserId = getCurrentUserId();
            if (!currentUserId) {
                alert('Please log in to view saved waypoints');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/waypoint/my-bookmarks`, {
                method: 'GET',
                headers: getAuthHeaders()
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
                alert('No saved waypoints found');
            }
        } catch (err) {
            console.error('Error fetching saved waypoints:', err);
            alert(err.message);
        }
    };

    // Navigate to a saved waypoint
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
        
        // Clear the popup flag and navigation lock after the movement completes
        setTimeout(() => {
            setShouldOpenPopup(false);
            setIsNavigating(false);
        }, 1500); // Shorter timeout for quicker navigation
    };

    // Navigate to previous saved waypoint
    const goToPreviousSaved = () => {
        if (savedWaypoints.length === 0 || isNavigating) return;
        
        const newIndex = currentSavedIndex > 0 ? currentSavedIndex - 1 : savedWaypoints.length - 1;
        setCurrentSavedIndex(newIndex);
        navigateToSavedWaypoint(savedWaypoints[newIndex]);
    };

    // Navigate to next saved waypoint
    const goToNextSaved = () => {
        if (savedWaypoints.length === 0 || isNavigating) return;
        
        const newIndex = currentSavedIndex < savedWaypoints.length - 1 ? currentSavedIndex + 1 : 0;
        setCurrentSavedIndex(newIndex);
        navigateToSavedWaypoint(savedWaypoints[newIndex]);
    };

    // Create waypoint via API
    const createWaypoint = async (waypointData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/waypoint/create`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    title: waypointData.title,
                    description: waypointData.description,
                    type: waypointData.type,
                    latitude: newPinLocation.lat,
                    longitude: newPinLocation.lng,
                    expires_in_hours: 24 // Optional: expire after 24 hours
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create waypoint');
            }

            const data = await response.json();

            // Refresh waypoints to show the new one
            fetchWaypoints();
            
            setShowCreateModal(false);
            setNewPinLocation(null);
            setPlacementMode(false); // Exit placement mode after creating

        } catch (err) {
            console.error('Error creating waypoint:', err);
            setError(err.message);
        }
    };

    // Join waypoint (for event waypoints)
    const joinWaypoint = async (waypointId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/waypoint/${waypointId}/join`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to join waypoint');
            }

            const data = await response.json();

            // Refresh waypoints to update join count and status
            fetchWaypoints();

        } catch (err) {
            console.error('Error joining waypoint:', err);
            alert(err.message);
        }
    };

    // Join event from waypoint (for event waypoints)
    const joinEventFromWaypoint = async (waypoint) => {
        try {
            if (!waypoint || waypoint.type !== 'event') {
                alert('This is not an event waypoint');
                return;
            }

            // Find the corresponding event by matching title and coordinates
            const eventTitle = waypoint.title.replace(/^📅\s*/, ''); // Remove emoji prefix
            
            console.log('🎫 Looking for event to join:', eventTitle);
            console.log('Waypoint coordinates:', waypoint.coords);
            
            // Get events to find the matching one
            const eventsResponse = await fetch(`${API_BASE_URL}/events/feed?limit=100&include_past=false`, {
                headers: getAuthHeaders()
            });

            if (!eventsResponse.ok) {
                throw new Error('Failed to fetch events');
            }

            const eventsData = await eventsResponse.json();
            const events = eventsData.events || [];

            // Find the matching event by title and coordinates
            console.log('🔍 DETAILED SEARCH DEBUG:');
            console.log('Waypoint title (original):', waypoint.title);
            console.log('Waypoint title (cleaned):', eventTitle);
            console.log('Waypoint coordinates:', waypoint.coords);
            console.log('Total events available:', events.length);
            
            // Log all available events for comparison
            events.forEach((event, index) => {
                console.log(`Event ${index + 1}:`, {
                    title: event.title,
                    coords: [event.latitude, event.longitude],
                    hasCoords: event.latitude !== null && event.longitude !== null
                });
            });

            const matchingEvent = events.find(event => {
                console.log(`\n🔎 Checking event: "${event.title}"`);
                
                const titleMatch = event.title.toLowerCase().trim() === eventTitle.toLowerCase().trim();
                console.log('Title comparison:', {
                    eventTitle: event.title.toLowerCase().trim(),
                    waypointTitle: eventTitle.toLowerCase().trim(),
                    match: titleMatch
                });
                
                // Check coordinate proximity if both waypoint and event have coordinates
                let coordMatch = false;
                if (event.latitude !== null && event.latitude !== undefined && 
                    event.longitude !== null && event.longitude !== undefined) {
                    const latDiff = Math.abs(waypoint.coords[0] - event.latitude);
                    const lngDiff = Math.abs(waypoint.coords[1] - event.longitude);
                    // Within ~50 meters (approximately 0.0005 degrees) - more lenient
                    coordMatch = latDiff < 0.0005 && lngDiff < 0.0005;
                    
                    console.log('Coordinate comparison:', {
                        eventCoords: [event.latitude, event.longitude],
                        waypointCoords: waypoint.coords,
                        latDiff,
                        lngDiff,
                        threshold: 0.0001,
                        match: coordMatch
                    });
                } else {
                    console.log('Event has no coordinates');
                }

                const isMatch = titleMatch && coordMatch;
                console.log('Final match result:', isMatch);
                return isMatch;
            });

            if (!matchingEvent) {
                console.log('❌ No matching event found with strict matching');
                
                // Try fallback matching with more lenient criteria
                console.log('🔄 Trying fallback matching...');
                
                // First try: title match only (no coordinate requirement)
                const titleOnlyMatch = events.find(event => {
                    const titleMatch = event.title.toLowerCase().trim() === eventTitle.toLowerCase().trim();
                    return titleMatch;
                });
                
                if (titleOnlyMatch) {
                    console.log('✅ Found event by title only:', titleOnlyMatch);
                    // Use the title-only match
                    const joinResponse = await fetch(`${API_BASE_URL}/events/${titleOnlyMatch._id}/attend`, {
                        method: 'POST',
                        headers: getAuthHeaders()
                    });

                    if (!joinResponse.ok) {
                        const errorData = await joinResponse.json();
                        throw new Error(errorData.error || 'Failed to join event');
                    }

                    const joinData = await joinResponse.json();
                    console.log('✅ Event join response (fallback):', joinData);

                    fetchWaypoints();

                    if (joinData.attending) {
                        alert('Successfully joined the event! 🎉\n\nYou can now see the "✅ Joined" status on the waypoint.');
                    } else {
                        alert('You have left the event.\n\nThe waypoint will now show "🎫 Join Event" again.');
                    }
                    return;
                }
                
                // Second try: partial title match
                const partialMatch = events.find(event => {
                    const eventTitleLower = event.title.toLowerCase().trim();
                    const waypointTitleLower = eventTitle.toLowerCase().trim();
                    const partialMatch = eventTitleLower.includes(waypointTitleLower) || waypointTitleLower.includes(eventTitleLower);
                    return partialMatch;
                });
                
                if (partialMatch) {
                    console.log('✅ Found event by partial title match:', partialMatch);
                    // Ask user for confirmation since this is a partial match
                    const confirmed = window.confirm(`Found a potential match: "${partialMatch.title}"\n\nIs this the event you want to join?`);
                    if (!confirmed) return;
                    
                    // Use the partial match
                    const joinResponse = await fetch(`${API_BASE_URL}/events/${partialMatch._id}/attend`, {
                        method: 'POST',
                        headers: getAuthHeaders()
                    });

                    if (!joinResponse.ok) {
                        const errorData = await joinResponse.json();
                        throw new Error(errorData.error || 'Failed to join event');
                    }

                    const joinData = await joinResponse.json();
                    console.log('✅ Event join response (partial match):', joinData);

                    fetchWaypoints();

                    if (joinData.attending) {
                        alert('Successfully joined the event! 🎉\n\nYou can now see the "✅ Joined" status on the waypoint.');
                    } else {
                        alert('You have left the event.\n\nThe waypoint will now show "🎫 Join Event" again.');
                    }
                    return;
                }
                
                console.log('❌ No matching event found even with fallback methods');
                alert('Could not find the corresponding event. It may have been cancelled or expired.');
                return;
            }

            console.log('✅ Found matching event:', matchingEvent._id);

            // Join the event using the events API
            const joinResponse = await fetch(`${API_BASE_URL}/events/${matchingEvent._id}/attend`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (!joinResponse.ok) {
                const errorData = await joinResponse.json();
                throw new Error(errorData.error || 'Failed to join event');
            }

            const joinData = await joinResponse.json();

            console.log('✅ Event join response:', joinData);

            // Refresh waypoints to update attendance status
            fetchWaypoints();

            if (joinData.attending) {
                alert('Successfully joined the event! 🎉\n\nYou can now see the "✅ Joined" status on the waypoint.');
            } else {
                alert('You have left the event.\n\nThe waypoint will now show "🎫 Join Event" again.');
            }

        } catch (err) {
            console.error('Error joining event from waypoint:', err);
            alert(err.message || 'Failed to join event');
        }
    };

    // Like waypoint
    const likeWaypoint = async (waypointId) => {
        try {
            const currentUserId = getCurrentUserId();
            
            if (!currentUserId) {
                alert('Please log in to like waypoints');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/waypoint/${waypointId}/like`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to like waypoint');
            }

            const data = await response.json();

            // Refresh waypoints to get updated state from backend
            fetchWaypoints();

        } catch (err) {
            console.error('Error liking waypoint:', err);
            alert(err.message);
        }
    };

    // Bookmark waypoint
    const bookmarkWaypoint = async (waypointId) => {
        try {
            const currentUserId = getCurrentUserId();
            
            if (!currentUserId) {
                alert('Please log in to bookmark waypoints');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/waypoint/${waypointId}/bookmark`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to bookmark waypoint');
            }

            const data = await response.json();

            // Refresh waypoints to get the updated state from backend
            fetchWaypoints();

        } catch (err) {
            console.error('Error bookmarking waypoint:', err);
            alert(err.message);
        }
    };

    // Delete waypoint (only if user owns it)
    const deleteWaypoint = async (waypointId, waypointTitle) => {
        try {
            // Find the waypoint to check if it's an event waypoint
            const waypoint = waypoints.find(w => w.id === waypointId);
            const isEventWaypoint = waypoint && (waypoint.type === 'event' || waypoint.title.startsWith('📅'));

            if (isEventWaypoint) {
                // For event waypoints, we need to find and cancel the corresponding event
                return await deleteEventFromWaypoint(waypoint, waypointTitle);
            }

            // For regular waypoints, proceed with normal deletion
            const confirmed = window.confirm(`Are you sure you want to delete "${waypointTitle}"?\n\nThis action cannot be undone.`);
            if (!confirmed) return;

            const response = await fetch(`${API_BASE_URL}/waypoint/${waypointId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete waypoint');
            }

            const data = await response.json();

            // Refresh waypoints to remove the deleted one
            fetchWaypoints();

        } catch (err) {
            console.error('Error deleting waypoint:', err);
            alert(err.message);
        }
    };

    // Delete event from waypoint (for event waypoints)
    const deleteEventFromWaypoint = async (waypoint, waypointTitle) => {
        try {
            // Confirm deletion - make it clear this will cancel the event
            const confirmed = window.confirm(`Are you sure you want to cancel the event "${waypointTitle}"?\n\nThis will remove both the event and its waypoint from the map.\n\nThis action cannot be undone.`);
            if (!confirmed) return;

            // First, we need to find the corresponding event in the events system
            // We'll search for the event by matching title and coordinates
            const eventTitle = waypointTitle.replace(/^📅\s*/, ''); // Remove emoji prefix
            
            console.log('🔍 Looking for event to cancel:', eventTitle);
            console.log('Waypoint coordinates:', waypoint.coords);
            
            // Get events to find the matching one
            const eventsResponse = await fetch(`${API_BASE_URL}/events/feed?limit=100&include_past=true`, {
                headers: getAuthHeaders()
            });

            if (!eventsResponse.ok) {
                throw new Error('Failed to fetch events for deletion');
            }

            const eventsData = await eventsResponse.json();
            const events = eventsData.events || [];

            // Find the matching event by title and coordinates
            const matchingEvent = events.find(event => {
                const titleMatch = event.title.toLowerCase().trim() === eventTitle.toLowerCase().trim();
                
                // Check coordinate proximity if both waypoint and event have coordinates
                let coordMatch = false;
                if (event.latitude !== null && event.latitude !== undefined && 
                    event.longitude !== null && event.longitude !== undefined) {
                    const latDiff = Math.abs(waypoint.coords[0] - event.latitude);
                    const lngDiff = Math.abs(waypoint.coords[1] - event.longitude);
                    // Within ~50 meters (approximately 0.0005 degrees) - more lenient
                    coordMatch = latDiff < 0.0005 && lngDiff < 0.0005;
                }

                console.log('Checking event:', {
                    title: event.title,
                    titleMatch,
                    coordMatch,
                    eventCoords: [event.latitude, event.longitude]
                });

                return titleMatch && coordMatch;
            });

            if (!matchingEvent) {
                console.log('❌ No matching event found, falling back to waypoint deletion');
                // If we can't find the event, just delete the waypoint
                // This could happen if the event was already deleted from elsewhere or if there's a data inconsistency
                const response = await fetch(`${API_BASE_URL}/waypoint/${waypoint.id}`, {
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to delete waypoint');
                }

                fetchWaypoints();
                alert('Waypoint deleted successfully');
                return;
            }

            console.log('✅ Found matching event:', matchingEvent._id);

            // Check if the current user owns this event
            const currentUserId = getCurrentUserId();
            const eventUserId = String(matchingEvent.user_id || '');
            const currentUserIdStr = String(currentUserId || '');
            
            if (currentUserIdStr !== eventUserId || currentUserIdStr === '') {
                alert('You can only cancel your own events');
                return;
            }

            // Cancel the event using the events API
            const cancelResponse = await fetch(`${API_BASE_URL}/events/${matchingEvent._id}/cancel`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (!cancelResponse.ok) {
                const errorData = await cancelResponse.json();
                throw new Error(errorData.error || 'Failed to cancel event');
            }

            console.log('✅ Event cancelled successfully');

            // Now delete the corresponding waypoint since the backend doesn't do it automatically
            console.log('🗑️ Deleting corresponding waypoint:', waypoint.id);
            const waypointDeleteResponse = await fetch(`${API_BASE_URL}/waypoint/${waypoint.id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (!waypointDeleteResponse.ok) {
                console.warn('⚠️ Failed to delete waypoint after cancelling event:', waypointDeleteResponse.status);
                // Don't throw error here - the event was successfully cancelled, waypoint deletion is secondary
            } else {
                console.log('✅ Waypoint deleted successfully');
            }

            // Refresh waypoints to remove the deleted waypoint
            fetchWaypoints();

            alert('Event cancelled successfully');

        } catch (err) {
            console.error('Error cancelling event from waypoint:', err);
            alert(err.message || 'Failed to cancel event');
        }
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
            // If turning off placement mode, clear any pending location
            setNewPinLocation(null);
            setShowCreateModal(false);
        }
    };

    // Handle map click for waypoint placement
    const handleMapClick = (latlng) => {
        setNewPinLocation(latlng);
        setShowCreateModal(true);
    };

    // Handle creating waypoint
    const handleCreatePin = (pinData) => {
        createWaypoint(pinData);
    };

    // Function to find and navigate to the actual existing event waypoint
    const findAndNavigateToEventWaypoint = (eventData) => {
        console.log('🔍 SEARCHING FOR EXISTING EVENT WAYPOINT');
        console.log('Event data received:', eventData);
        console.log('Available waypoints:', waypoints.length);
        console.log('Event waypoints available:', waypoints.filter(w => w.type === 'event'));
        
        // Look for the actual existing event waypoint that matches this event
        const eventWaypoint = waypoints.find(waypoint => {
            console.log('Checking waypoint:', waypoint.title, waypoint.type);
            
            // Must be an event type waypoint
            if (waypoint.type !== 'event') {
                return false;
            }
            
            // Check if this waypoint title matches the event title
            // Remove the 📅 emoji prefix from waypoint title for comparison
            const waypointTitle = waypoint.title.replace(/^📅\s*/, '').trim().toLowerCase();
            const eventTitle = eventData.title.trim().toLowerCase();
            
            console.log('Comparing titles:', waypointTitle, 'vs', eventTitle);
            
            // Exact title match (case insensitive)
            const titleMatch = waypointTitle === eventTitle;
            
            // If we have coordinates in the event data, also check coordinate proximity
            let coordMatch = false;
            if (eventData.latitude !== null && eventData.latitude !== undefined && 
                eventData.longitude !== null && eventData.longitude !== undefined) {
                const latDiff = Math.abs(waypoint.coords[0] - eventData.latitude);
                const lngDiff = Math.abs(waypoint.coords[1] - eventData.longitude);
                // Within ~10 meters (approximately 0.0001 degrees) - very precise match
                coordMatch = latDiff < 0.0001 && lngDiff < 0.0001;
                
                console.log('Coordinate check:', {
                    waypointCoords: waypoint.coords,
                    eventCoords: [eventData.latitude, eventData.longitude],
                    latDiff,
                    lngDiff,
                    coordMatch
                });
            }
            
            // Match if BOTH title matches AND coordinates match closely (for precision)
            const isMatch = titleMatch && coordMatch;
            console.log('Match result:', isMatch, { titleMatch, coordMatch });
            
            return isMatch;
        });

        if (eventWaypoint) {
            console.log('✅ Found existing event waypoint:', eventWaypoint);
            // Found the actual existing waypoint, navigate to it with popup
            setTargetWaypoint(eventWaypoint);
            setShouldOpenPopup(true);
            
            // Clear the popup flag after navigation
            setTimeout(() => {
                setShouldOpenPopup(false);
            }, 3000);
        } else {
            console.log('❌ No matching event waypoint found on map');
            console.log('Available event waypoints:', waypoints.filter(w => w.type === 'event').map(w => ({
                title: w.title,
                coords: w.coords
            })));
            
            // Alert user that the waypoint doesn't exist or has expired
            alert('This event waypoint is not currently available on the map. The event waypoint may have expired or was not created.');
        }
    };

    // Handle keyboard navigation for saved waypoints
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isNavigatingSaved || isNavigating) return;
            
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goToPreviousSaved();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                goToNextSaved();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsNavigatingSaved(false);
                setSavedWaypoints([]);
                setCurrentSavedIndex(-1);
                setIsNavigating(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isNavigatingSaved, currentSavedIndex, savedWaypoints.length, isNavigating]);

    // Load waypoints on component mount
    useEffect(() => {
        fetchWaypoints();
    }, []);

    // Handle event navigation after waypoints are loaded
    useEffect(() => {
        const eventNavData = sessionStorage.getItem('navigateToEvent');
        if (eventNavData && waypoints.length > 0) {
            try {
                const eventData = JSON.parse(eventNavData);
                // Clear the session storage
                sessionStorage.removeItem('navigateToEvent');
                
                // Find and navigate to the event waypoint
                findAndNavigateToEventWaypoint(eventData);
                
            } catch (error) {
                console.error('Error parsing event navigation data:', error);
            }
        }
    }, [waypoints]); // Depend on waypoints being loaded

    // Auto-refresh every 30 seconds to catch cleanup events
    useEffect(() => {
        const interval = setInterval(() => {
            fetchWaypoints();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, []);

    // Loading state
    if (loading) {
        return (
            <div className="h-screen overflow-hidden font-bold" style={{
                backgroundColor: isDarkMode ? '#121212' : '#ffffff', 
                fontFamily: 'Albert Sans'
            }}>
                <Sidebar />
                <div className="ml-64 h-full overflow-y-auto p-6">
                    <div className="max-w-full mx-auto h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                            <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Loading Waypoints...</h2>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Fetching campus community data</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden font-bold" style={{
            backgroundColor: isDarkMode ? '#121212' : '#ffffff', 
            fontFamily: 'Albert Sans'
        }}>
            <Sidebar />
            <div className="ml-64 h-full overflow-y-auto p-6">
                <div className="max-w-full mx-auto h-full flex flex-col">


                    {/* Header */}
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

                    {/* Map Container */}
                    <WaypointMap
                        waypoints={waypoints}
                        placementMode={placementMode}
                        refreshing={refreshing}
                        onMapClick={handleMapClick}
                        onJoinWaypoint={joinWaypoint}
                        onDeleteWaypoint={deleteWaypoint}
                        onLikeWaypoint={likeWaypoint}
                        onBookmarkWaypoint={bookmarkWaypoint}
                        onJoinEvent={joinEventFromWaypoint}
                        getCurrentUser={getCurrentUser}
                        TMU_COORDS={TMU_COORDS}
                        ZOOM_LEVEL={ZOOM_LEVEL}
                        targetWaypoint={targetWaypoint}
                        shouldOpenPopup={shouldOpenPopup}
                        // Navigation overlay props
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
                        onSubmit={handleCreatePin}
                        location={newPinLocation}
                    />
                </div>
            </div>
        </div>
    );
}

export default Waypoint;