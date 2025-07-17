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
    const [targetWaypoint, setTargetWaypoint] = useState(null);
    const [shouldOpenPopup, setShouldOpenPopup] = useState(false);
    
    // Saved waypoints navigation state
    const [savedWaypoints, setSavedWaypoints] = useState([]);
    const [currentSavedIndex, setCurrentSavedIndex] = useState(-1);
    const [isNavigatingSaved, setIsNavigatingSaved] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false); // Prevent rapid navigation

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
            
            const transformedWaypoints = data.waypoints.map(waypoint => {
                const currentUsername = getCurrentUser();
                const currentUserId = getCurrentUserId();
                
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
                    // Use backend data to determine user interaction status
                    isLiked: currentUserId ? waypoint.liked_users?.includes(currentUserId) : false,
                    isBookmarked: currentUserId ? waypoint.bookmarked_users?.includes(currentUserId) : false,
                    isOwner: currentUsername && waypoint.username === currentUsername,
                    liked_users: waypoint.liked_users || [],
                    bookmarked_users: waypoint.bookmarked_users || []
                };
            });

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

            // Refresh waypoints to remove the deleted one
            fetchWaypoints();

        } catch (err) {
            console.error('Error deleting waypoint:', err);
            alert(err.message);
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

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
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