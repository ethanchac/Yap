import { useState, useEffect } from 'react';
import Sidebar from '../../sidebar/Sidebar.jsx';
import WaypointModal from './WaypointModal.jsx';
import WaypointHeader from './WaypointHeader.jsx';
import WaypointMap from './WaypointMap.jsx';

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

    // TMU Campus coordinates
    const TMU_COORDS = [43.6577, -79.3788];
    const ZOOM_LEVEL = 16;
    const API_BASE_URL = 'http://localhost:5000';

    // Get auth headers
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    };

    // Fetch waypoints from API
    const fetchWaypoints = async () => {
        try {
            setError(null);
            
            const response = await fetch(`${API_BASE_URL}/waypoint/campus/tmu?radius=2`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch waypoints');
            }

            const data = await response.json();
            
            const transformedWaypoints = data.waypoints.map(waypoint => {
                const currentUserId = getCurrentUser();
                
                return {
                    id: waypoint._id,
                    coords: [waypoint.latitude, waypoint.longitude],
                    title: waypoint.title,
                    description: waypoint.description,
                    type: waypoint.type,
                    time: waypoint.time_ago || 'recently',
                    author: waypoint.username,
                    active: true,
                    interactions: waypoint.interactions || { likes: 0, joins: 0, bookmarks: 0 },
                    distance_km: waypoint.distance_km,
                    // Check if current user has liked/bookmarked this waypoint
                    isLiked: currentUserId && waypoint.liked_users ? waypoint.liked_users.includes(currentUserId) : false,
                    isBookmarked: currentUserId && waypoint.bookmarked_users ? waypoint.bookmarked_users.includes(currentUserId) : false
                };
            });

            setWaypoints(transformedWaypoints);
            console.log(`✅ Loaded ${transformedWaypoints.length} waypoints`);
            
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
            console.log('✅ Waypoint created successfully:', data.waypoint);

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
            console.log('✅ Join status updated:', data);

            // Refresh waypoints to update join count
            fetchWaypoints();

        } catch (err) {
            console.error('Error joining waypoint:', err);
            alert(err.message);
        }
    };

    // Like waypoint (for manual waypoints)
    const likeWaypoint = async (waypointId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/waypoint/${waypointId}/like`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to like waypoint');
            }

            const data = await response.json();
            console.log('✅ Like status updated:', data);

            // Refresh waypoints to update like count
            fetchWaypoints();

        } catch (err) {
            console.error('Error liking waypoint:', err);
            alert(err.message);
        }
    };

    // Bookmark waypoint (for manual waypoints)
    const bookmarkWaypoint = async (waypointId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/waypoint/${waypointId}/bookmark`, {
                method: 'POST',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to bookmark waypoint');
            }

            const data = await response.json();
            console.log('✅ Bookmark status updated:', data);

            // Refresh waypoints to update bookmark count
            fetchWaypoints();

        } catch (err) {
            console.error('Error bookmarking waypoint:', err);
            alert(err.message);
        }
    };

    // Delete waypoint (only if user owns it)
    const deleteWaypoint = async (waypointId, waypointTitle) => {
        try {
            // Confirm deletion
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
            console.log('✅ Waypoint deleted:', data);

            // Refresh waypoints to remove the deleted one
            fetchWaypoints();

        } catch (err) {
            console.error('Error deleting waypoint:', err);
            alert(err.message);
        }
    };

    // Get current user info
    const getCurrentUser = () => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        try {
            // Decode JWT token to get user info (basic implementation)
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.user_id || payload._id; // Return user ID for status checking
        } catch (err) {
            console.error('Error decoding token:', err);
            return null;
        }
    };

    // Get current username for display
    const getCurrentUsername = () => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        try {
            // Decode JWT token to get user info (basic implementation)
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.username;
        } catch (err) {
            console.error('Error decoding token:', err);
            return null;
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

    // Load waypoints on component mount
    useEffect(() => {
        fetchWaypoints();
    }, []);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            console.log('🔄 Auto-refreshing waypoints...');
            fetchWaypoints();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, []);

    // Loading state
    if (loading) {
        return (
            <div className="h-screen overflow-hidden font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
                <Sidebar />
                <div className="ml-64 h-full overflow-y-auto p-6">
                    <div className="max-w-full mx-auto h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                            <h2 className="text-white text-xl font-bold mb-2">Loading Waypoints...</h2>
                            <p className="text-gray-400">Fetching campus community data</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
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
                        getCurrentUser={getCurrentUsername}
                        TMU_COORDS={TMU_COORDS}
                        ZOOM_LEVEL={ZOOM_LEVEL}
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