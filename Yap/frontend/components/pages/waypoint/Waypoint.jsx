import { useState, useEffect } from 'react';
import Sidebar from '../../sidebar/Sidebar.jsx';
import WaypointModal from './WaypointModal.jsx';
import { MapPin, Users, Clock, Plus, AlertCircle, RefreshCw, Target, X } from 'lucide-react';

// Import Leaflet components directly
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Import Leaflet CSS - make sure this is in your main CSS file
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
            
            // Transform API data to match our component format
            const transformedWaypoints = data.waypoints.map(waypoint => ({
                id: waypoint._id,
                coords: [waypoint.latitude, waypoint.longitude],
                title: waypoint.title,
                description: waypoint.description,
                type: waypoint.type,
                time: waypoint.time_ago || 'recently',
                author: waypoint.username,
                active: true,
                interactions: waypoint.interactions || { likes: 0, joins: 0 },
                distance_km: waypoint.distance_km
            }));

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

    // Join waypoint
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

    const handleCreatePin = (pinData) => {
        createWaypoint(pinData);
    };

    // Custom icons for different pin types
    const createCustomIcon = (type) => {
        const getColor = (type) => {
            switch (type) {
                case 'food': return '#f59e0b';
                case 'study': return '#3b82f6';
                case 'group': return '#10b981';
                case 'social': return '#8b5cf6';
                case 'event': return '#ef4444';
                default: return '#6b7280';
            }
        };

        const getEmoji = (type) => {
            switch (type) {
                case 'food': return '🍕';
                case 'study': return '📚';
                case 'group': return '👥';
                case 'social': return '🎉';
                case 'event': return '📅';
                default: return '📍';
            }
        };

        return L.divIcon({
            className: 'custom-waypoint-marker',
            html: `
                <div style="
                    background-color: ${getColor(type)};
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
                    ">${getEmoji(type)}</span>
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
        });
    };

    // Campus marker icon
    const campusIcon = L.divIcon({
        className: 'campus-marker',
        html: `
            <div style="
                background-color: #dc2626;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                border: 4px solid white;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
            ">🏫</div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    // Component to handle map clicks
    function MapClickHandler() {
        useMapEvents({
            click: (e) => {
                // Only allow waypoint creation if in placement mode
                if (placementMode) {
                    setNewPinLocation(e.latlng);
                    setShowCreateModal(true);
                }
            }
        });
        return null;
    }

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
                    <div className="mb-6 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <MapPin className="w-8 h-8 text-orange-400" />
                                <div>
                                    <h1 className="text-white text-3xl font-bold">Waypoints</h1>
                                    <p className="text-gray-400">Real-time campus community map</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                {/* Placement Mode Toggle */}
                                <button
                                    onClick={togglePlacementMode}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-all transform hover:scale-105 ${
                                        placementMode 
                                            ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25' 
                                            : 'bg-gray-700 hover:bg-gray-600 text-white'
                                    }`}
                                >
                                    {placementMode ? (
                                        <>
                                            <X className="w-4 h-4" />
                                            <span>Cancel Placement</span>
                                        </>
                                    ) : (
                                        <>
                                            <Target className="w-4 h-4" />
                                            <span>Place Waypoint</span>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleRefresh}
                                    disabled={refreshing}
                                    className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                                >
                                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                    <span>Refresh</span>
                                </button>
                                
                                <div className="text-right text-sm text-gray-400">
                                    <div>
                                        {placementMode ? (
                                            <span className="text-orange-400 font-semibold">🎯 Click map to place waypoint</span>
                                        ) : (
                                            <span>📍 Enable placement mode to add waypoints</span>
                                        )}
                                    </div>
                                    <div>🗺️ {waypoints.length} active waypoints</div>
                                </div>
                            </div>
                        </div>

                        {/* Placement Mode Banner */}
                        {placementMode && (
                            <div className="mt-4 p-4 bg-orange-900 border border-orange-600 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <Target className="w-5 h-5 text-orange-400" />
                                        <div>
                                            <p className="text-orange-200 font-semibold">Placement Mode Active</p>
                                            <p className="text-orange-300 text-sm">Click anywhere on the map to create a new waypoint</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={togglePlacementMode}
                                        className="text-orange-400 hover:text-orange-300 p-1"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Error Banner */}
                        {error && (
                            <div className="mt-4 p-3 bg-red-900 border border-red-600 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                    <span className="text-red-200">{error}</span>
                                    <button 
                                        onClick={() => setError(null)}
                                        className="ml-auto text-red-400 hover:text-red-300"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Map Container */}
                    <div className="flex-1 relative rounded-lg overflow-hidden" style={{backgroundColor: '#171717', minHeight: '600px'}}>
                        <MapContainer
                            center={TMU_COORDS}
                            zoom={ZOOM_LEVEL}
                            style={{ 
                                height: '100%', 
                                width: '100%', 
                                minHeight: '600px',
                                cursor: placementMode ? 'crosshair' : 'grab'
                            }}
                            zoomControl={true}
                            scrollWheelZoom={true}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='© OpenStreetMap contributors'
                                maxZoom={19}
                            />

                            {/* Campus Marker */}
                            <Marker position={TMU_COORDS} icon={campusIcon}>
                                <Popup>
                                    <div style={{ textAlign: 'center', fontFamily: 'Albert Sans, sans-serif' }}>
                                        <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>TMU Campus</h3>
                                        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                                            Toronto Metropolitan University
                                        </p>
                                    </div>
                                </Popup>
                            </Marker>

                            {/* Waypoint Markers */}
                            {waypoints.map((waypoint) => {
                                const currentUser = getCurrentUser();
                                const isOwner = currentUser && waypoint.author === currentUser;
                                
                                return (
                                    <Marker 
                                        key={waypoint.id} 
                                        position={waypoint.coords} 
                                        icon={createCustomIcon(waypoint.type)}
                                    >
                                        <Popup maxWidth={250}>
                                            <div style={{ fontFamily: 'Albert Sans, sans-serif', minWidth: '200px' }}>
                                                {/* Header with optional delete button */}
                                                <div style={{ 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'flex-start',
                                                    marginBottom: '8px'
                                                }}>
                                                    <h3 style={{ 
                                                        margin: '0', 
                                                        color: '#1f2937', 
                                                        fontSize: '16px',
                                                        fontWeight: 'bold',
                                                        flex: 1,
                                                        paddingRight: isOwner ? '8px' : '0'
                                                    }}>
                                                        {waypoint.title}
                                                    </h3>
                                                    {isOwner && (
                                                        <button
                                                            onClick={() => deleteWaypoint(waypoint.id, waypoint.title)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: '#ef4444',
                                                                cursor: 'pointer',
                                                                fontSize: '16px',
                                                                padding: '2px',
                                                                borderRadius: '4px',
                                                                lineHeight: 1,
                                                                minWidth: '20px',
                                                                height: '20px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                            title="Delete waypoint"
                                                        >
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>

                                                <p style={{ 
                                                    margin: '0 0 12px 0', 
                                                    color: '#6b7280', 
                                                    fontSize: '14px',
                                                    lineHeight: '1.4'
                                                }}>
                                                    {waypoint.description}
                                                </p>
                                                <div style={{ 
                                                    fontSize: '12px', 
                                                    color: '#9ca3af',
                                                    marginBottom: '12px'
                                                }}>
                                                    <div style={{ marginBottom: '4px' }}>📅 {waypoint.time}</div>
                                                    <div style={{ 
                                                        marginBottom: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between'
                                                    }}>
                                                        <span>👤 {waypoint.author}</span>
                                                        {isOwner && (
                                                            <span style={{ 
                                                                color: '#10b981', 
                                                                fontSize: '10px',
                                                                fontWeight: 'bold',
                                                                background: '#10b981',
                                                                color: 'white',
                                                                padding: '1px 6px',
                                                                borderRadius: '8px'
                                                            }}>
                                                                YOUR WAYPOINT
                                                            </span>
                                                        )}
                                                    </div>
                                                    {waypoint.distance_km && (
                                                        <div style={{ marginBottom: '4px' }}>📍 {waypoint.distance_km}km away</div>
                                                    )}
                                                    <div className="flex items-center space-x-3 mt-2">
                                                        <span>👍 {waypoint.interactions?.likes || 0}</span>
                                                        <span>🤝 {waypoint.interactions?.joins || 0}</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Action button - different for owner vs others */}
                                                {isOwner ? (
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button 
                                                            onClick={() => deleteWaypoint(waypoint.id, waypoint.title)}
                                                            style={{
                                                                flex: 1,
                                                                padding: '6px 12px',
                                                                backgroundColor: '#ef4444',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '12px',
                                                                fontWeight: 'bold',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                        <button 
                                                            onClick={() => joinWaypoint(waypoint.id)}
                                                            style={{
                                                                flex: 1,
                                                                padding: '6px 12px',
                                                                backgroundColor: '#f59e0b',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '12px',
                                                                fontWeight: 'bold',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Update
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => joinWaypoint(waypoint.id)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: '#f59e0b',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            cursor: 'pointer',
                                                            width: '100%'
                                                        }}
                                                    >
                                                        Join Waypoint
                                                    </button>
                                                )}
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}

                            {/* Handle map clicks */}
                            <MapClickHandler />
                        </MapContainer>

                        {/* Map Legend */}
                        <div className="absolute top-4 right-4 bg-white rounded-lg p-3 shadow-lg z-[1000]" style={{fontFamily: 'Albert Sans'}}>
                            <h4 className="font-bold text-gray-800 mb-2 text-sm">Legend</h4>
                            <div className="space-y-1 text-xs">
                                <div className="flex items-center space-x-2">
                                    <span>🍕</span>
                                    <span className="text-gray-700">Food & Events</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span>📚</span>
                                    <span className="text-gray-700">Study Spots</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span>👥</span>
                                    <span className="text-gray-700">Groups & Social</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span>🎉</span>
                                    <span className="text-gray-700">Social Events</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span>📅</span>
                                    <span className="text-gray-700">Events</span>
                                </div>
                            </div>
                        </div>

                        {/* Live Stats */}
                        <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white rounded-lg p-3 z-[1000]">
                            <div className="flex items-center space-x-4 text-sm">
                                <div className="flex items-center space-x-1">
                                    <Users className="w-4 h-4" />
                                    <span>{waypoints.length} active</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>Live updates</span>
                                </div>
                                {placementMode && (
                                    <div className="flex items-center space-x-1">
                                        <Target className="w-4 h-4 text-orange-400" />
                                        <span className="text-orange-400">Placement mode</span>
                                    </div>
                                )}
                                {refreshing && (
                                    <div className="flex items-center space-x-1">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Updating...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

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