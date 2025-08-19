import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import { createCustomIcon, campusIcon, slcIcon } from './waypointIcons.js';
import WaypointPopup from './WaypointPopup.jsx';
import WaypointLegend from './WaypointLegend.jsx';
import WaypointStats from './WaypointStats.jsx';
import WaypointNavigationOverlay from './WaypointNavigationOverlay.jsx';

// Component to handle map clicks
function MapClickHandler({ placementMode, onMapClick }) {
    useMapEvents({
        click: (e) => {
            // Only allow waypoint creation if in placement mode
            if (placementMode) {
                onMapClick(e.latlng);
            }
        }
    });
    return null;
}

// Component to handle map navigation
function MapNavigator({ targetWaypoint, shouldOpenPopup }) {
    const map = useMap();
    
    useEffect(() => {
        if (targetWaypoint) {
            // Always use flyTo for precise centering and smooth movement
            map.flyTo(targetWaypoint.coords, 18, {
                duration: 1.0,
                easeLinearity: 0.05,
                animate: true
            });
            
            // If we should open the popup, do it much faster
            if (shouldOpenPopup) {
                setTimeout(() => {
                    // Find the marker and open its popup
                    map.eachLayer((layer) => {
                        if (layer.options && layer.options.waypointId === targetWaypoint.id) {
                            layer.openPopup();
                        }
                    });
                }, 400); // Much faster popup opening
            }
        }
    }, [targetWaypoint, shouldOpenPopup, map]);
    
    return null;
}

function WaypointMap({ 
    waypoints, 
    placementMode, 
    refreshing, 
    onMapClick, 
    onJoinWaypoint, 
    onDeleteWaypoint, 
    onLikeWaypoint,
    onBookmarkWaypoint,
    onJoinEvent,
    getCurrentUser,
    TMU_COORDS = [42.6577, -79.3788],
    ZOOM_LEVEL = 16,
    targetWaypoint = null,
    shouldOpenPopup = false,
    // Navigation overlay props
    isNavigatingSaved = false,
    currentSavedWaypoint = null,
    currentSavedIndex = -1,
    savedWaypointsCount = 0,
    onPreviousSaved,
    onNextSaved
}) {
    // Get both current username and user ID
    const currentUsername = getCurrentUser();
    const markerRefs = useRef({});
    
    // SLC coordinates (at the Library Building location)
    const SLC_COORDS = [43.6578, -79.3805];
    
    // Get current user ID from JWT token
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
    
    const currentUserId = getCurrentUserId();

    return (
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

                {/* Student Learning Centre (SLC) Marker */}
                <Marker position={SLC_COORDS} icon={slcIcon}>
                    <Popup>
                        <div style={{ textAlign: 'center', fontFamily: 'Albert Sans, sans-serif' }}>
                            <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Student Learning Centre</h3>
                            <p style={{ margin: '0 0 4px 0', color: '#6b7280', fontSize: '14px' }}>
                                📚 Study spaces, tutoring, and academic support
                            </p>
                            <p style={{ margin: 0, color: '#2563eb', fontSize: '12px', fontWeight: 'bold' }}>
                                SLC Building
                            </p>
                        </div>
                    </Popup>
                </Marker>

                {/* Waypoint Markers */}
                {waypoints.map((waypoint) => {
                    return (
                        <Marker 
                            key={waypoint.id} 
                            position={waypoint.coords} 
                            icon={createCustomIcon(waypoint.type)}
                            ref={(ref) => {
                                if (ref) {
                                    markerRefs.current[waypoint.id] = ref;
                                    // Add waypoint ID to marker options for identification
                                    ref.options.waypointId = waypoint.id;
                                }
                            }}
                        >
                            {/* Tooltip for hover */}
                            <Tooltip 
                                direction="top" 
                                offset={[0, -20]} 
                                opacity={0.9}
                                permanent={false}
                                interactive={false}
                                sticky={false}
                            >
                                <div style={{ 
                                    fontFamily: 'Albert Sans, sans-serif',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    textAlign: 'center',
                                    padding: '2px 4px'
                                }}>
                                    {waypoint.title}
                                </div>
                            </Tooltip>

                            {/* Popup for click (detailed info) */}
                            <Popup maxWidth={250}>
                                <WaypointPopup 
                                    waypoint={waypoint}
                                    isOwner={waypoint.isOwner}
                                    currentUserId={currentUserId}
                                    onJoin={onJoinWaypoint}
                                    onDelete={onDeleteWaypoint}
                                    onLike={onLikeWaypoint}
                                    onBookmark={onBookmarkWaypoint}
                                    onJoinEvent={onJoinEvent}
                                />
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Handle map clicks */}
                <MapClickHandler 
                    placementMode={placementMode} 
                    onMapClick={onMapClick} 
                />

                {/* Handle navigation to target waypoint */}
                <MapNavigator 
                    targetWaypoint={targetWaypoint}
                    shouldOpenPopup={shouldOpenPopup}
                />
            </MapContainer>

            {/* Map Legend */}
            <WaypointLegend />

            {/* Live Stats */}
            <WaypointStats 
                waypointCount={waypoints.length}
                placementMode={placementMode}
                refreshing={refreshing}
            />

            {/* Navigation Overlay for Saved Waypoints */}
            <WaypointNavigationOverlay
                isVisible={isNavigatingSaved}
                currentWaypoint={currentSavedWaypoint}
                currentIndex={currentSavedIndex}
                totalCount={savedWaypointsCount}
                onPrevious={onPreviousSaved}
                onNext={onNextSaved}
            />
        </div>
    );
}

export default WaypointMap;