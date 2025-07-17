import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom event location marker
const eventLocationIcon = L.divIcon({
    className: 'event-location-marker',
    html: `
        <div style="
            background-color: #3b82f6;
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
                font-size: 16px;
                line-height: 1;
                color: white;
            ">📅</span>
        </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
});

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }) {
    useMapEvents({
        click: (e) => {
            onLocationSelect(e.latlng);
        }
    });
    return null;
}

function EventLocationMap({ selectedLocation, onLocationSelect, onLocationClear }) {
    const [showMap, setShowMap] = useState(false);
    
    // TMU Campus coordinates as default center
    const TMU_COORDS = [43.6577, -79.3788];
    const ZOOM_LEVEL = 16;

    const handleLocationSelect = (latlng) => {
        onLocationSelect({
            lat: latlng.lat,
            lng: latlng.lng,
            address: `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`
        });
    };

    const handleClearLocation = () => {
        onLocationClear();
        setShowMap(false);
    };

    return (
        <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
                Event Location (Optional)
            </label>
            
            {/* Location Input/Display */}
            <div className="space-y-2">
                {selectedLocation ? (
                    <div className="p-3 bg-gray-700 border border-gray-600 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-white text-sm font-medium">📍 Location Selected</div>
                                <div className="text-gray-400 text-xs">
                                    {selectedLocation.address}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleClearLocation}
                                className="text-red-400 hover:text-red-300 text-sm font-medium"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowMap(!showMap)}
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-left"
                    >
                        {showMap ? '📍 Click on the map to select location' : '🗺️ Click to select location on map'}
                    </button>
                )}
            </div>

            {/* Interactive Map Container */}
            {showMap && (
                <div className="mt-3 rounded-lg overflow-hidden border border-gray-600">
                    <div className="bg-gray-800 p-2 text-center">
                        <span className="text-gray-300 text-sm">
                            {selectedLocation 
                                ? '🎯 Click anywhere to move your event location'
                                : '🎯 Click anywhere on the map to set your event location'
                            }
                        </span>
                    </div>
                    <div style={{ height: '350px', width: '100%' }}>
                        <MapContainer
                            center={selectedLocation ? [selectedLocation.lat, selectedLocation.lng] : TMU_COORDS}
                            zoom={selectedLocation ? 17 : ZOOM_LEVEL}
                            style={{ 
                                height: '100%', 
                                width: '100%',
                                cursor: 'crosshair'
                            }}
                            zoomControl={true}
                            scrollWheelZoom={true}
                            dragging={true}
                            doubleClickZoom={true}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='© OpenStreetMap contributors'
                                maxZoom={19}
                            />
                            
                            {/* Show marker if location is selected */}
                            {selectedLocation && (
                                <Marker 
                                    position={[selectedLocation.lat, selectedLocation.lng]} 
                                    icon={eventLocationIcon}
                                />
                            )}
                            
                            {/* Handle map clicks */}
                            <MapClickHandler onLocationSelect={handleLocationSelect} />
                        </MapContainer>
                    </div>
                    
                    {/* Map Controls */}
                    <div className="bg-gray-800 p-2 flex justify-between items-center">
                        <div className="text-gray-400 text-xs">
                            {selectedLocation 
                                ? '✅ Location set! You can still click to change it.'
                                : '💡 Tip: Zoom in for more precise location selection'
                            }
                        </div>
                        {selectedLocation && (
                            <button
                                type="button"
                                onClick={() => setShowMap(false)}
                                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                            >
                                Done ✓
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default EventLocationMap;