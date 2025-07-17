import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { createCustomIcon, campusIcon } from './waypointIcons.js';
import WaypointPopup from './WaypointPopup.jsx';
import WaypointLegend from './WaypointLegend.jsx';
import WaypointStats from './WaypointStats.jsx';

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

function WaypointMap({ 
    waypoints, 
    placementMode, 
    refreshing, 
    onMapClick, 
    onJoinWaypoint, 
    onDeleteWaypoint, 
    onLikeWaypoint,
    onBookmarkWaypoint,
    getCurrentUser,
    TMU_COORDS = [43.6577, -79.3788],
    ZOOM_LEVEL = 16 
}) {
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
                                <WaypointPopup 
                                    waypoint={waypoint}
                                    isOwner={isOwner}
                                    onJoin={onJoinWaypoint}
                                    onDelete={onDeleteWaypoint}
                                    onLike={onLikeWaypoint}
                                    onBookmark={onBookmarkWaypoint}
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
            </MapContainer>

            {/* Map Legend */}
            <WaypointLegend />

            {/* Live Stats */}
            <WaypointStats 
                waypointCount={waypoints.length}
                placementMode={placementMode}
                refreshing={refreshing}
            />
        </div>
    );
}

export default WaypointMap;