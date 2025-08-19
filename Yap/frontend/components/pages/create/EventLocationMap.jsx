import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../../../contexts/ThemeContext'; // Add this import

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
    const { isDarkMode } = useTheme(); // Add this hook
    
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
            <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
                Event Location (Optional)
            </label>
            
            {/* Location Input/Display */}
            <div className="space-y-2">
                {selectedLocation ? (
                    <div className={`p-3 border rounded-lg ${
                        isDarkMode 
                            ? 'bg-gray-700 border-gray-600' 
                            : 'bg-gray-50 border-gray-300'
                    }`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className={`text-sm font-medium ${
                                    isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                    📍 Location Selected
                                </div>
                                <div className={`text-xs ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                    {selectedLocation.address}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleClearLocation}
                                className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowMap(!showMap)}
                        className={`w-full p-3 border rounded-lg text-left transition-colors ${
                            isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-gray-400 hover:text-white hover:border-gray-500'
                                : 'bg-gray-50 border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400'
                        }`}
                    >
                        {showMap ? '📍 Click on the map to select location' : '🗺️ Click to select location on map'}
                    </button>
                )}
            </div>

            {/* Interactive Map Container */}
            {showMap && (
                <div className={`mt-3 rounded-lg overflow-hidden border ${
                    isDarkMode ? 'border-gray-600' : 'border-gray-300'
                }`}>
                    <div className={`p-2 text-center ${
                        isDarkMode ? 'bg-[#1c1c1c]' : 'bg-gray-100'
                    }`}>
                        <span className={`text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
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
                    <div className={`p-2 flex justify-between items-center ${
                        isDarkMode ? 'bg-[#1c1c1c]' : 'bg-gray-100'
                    }`}>
                        <div className={`text-xs ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                            {selectedLocation 
                                ? '✅ Location set! You can still click to change it.'
                                : '💡 Tip: Zoom in for more precise location selection'
                            }
                        </div>
                        {selectedLocation && (
                            <button
                                type="button"
                                onClick={() => setShowMap(false)}
                                className={`text-sm font-medium transition-colors ${
                                    isDarkMode 
                                        ? 'text-blue-400 hover:text-blue-300' 
                                        : 'text-blue-600 hover:text-blue-500'
                                }`}
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