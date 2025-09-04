import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { MapPin, X } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

function EventLocationMap({ selectedLocation, onLocationSelect, onLocationClear }) {
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef(null);
  
  // TMU Campus coordinates as default center
  const TMU_COORDS = [43.6577, -79.3788];
  const ZOOM_LEVEL = 16;

  const handleLocationSelect = (latlng) => {
    onLocationSelect({
      lat: latlng.lat,
      lng: latlng.lng,
      address: `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`
    });
    setShowMap(false);
  };

  const handleClearLocation = () => {
    onLocationClear();
    setShowMap(false);
  };

  // Create the Leaflet map HTML for event location selection
  const createMapHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Event Location Map</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        #map { height: 100vh; width: 100vw; background: #171717; }
        .event-location-marker { background: transparent !important; border: none !important; }
        .leaflet-popup-content-wrapper { background: #1f2937; color: white; border-radius: 8px; }
        .leaflet-popup-content { margin: 12px; color: white; }
        .leaflet-popup-tip { background: #1f2937; }
        .leaflet-control-attribution { display: none; }
        .instruction-banner {
            position: absolute;
            top: 10px;
            left: 10px;
            right: 10px;
            background: rgba(249, 115, 22, 0.9);
            color: white;
            padding: 12px;
            border-radius: 8px;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="instruction-banner">
        📍 Tap anywhere on the map to set event location
    </div>
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

        // Custom event location marker
        const eventLocationIcon = L.divIcon({
            className: 'event-location-marker',
            html: \`
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
            \`,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
            popupAnchor: [0, -30]
        });

        let eventMarker = null;

        // Handle map clicks
        map.on('click', function(e) {
            // Remove existing marker
            if (eventMarker) {
                map.removeLayer(eventMarker);
            }
            
            // Add new marker at clicked location
            eventMarker = L.marker(e.latlng, { icon: eventLocationIcon })
                .addTo(map)
                .bindPopup(\`
                    <div style="text-align: center; color: white;">
                        <h3 style="margin: 0 0 8px 0; color: white;">📅 Event Location</h3>
                        <p style="margin: 0; color: #d1d5db; font-size: 14px;">
                            \${e.latlng.lat.toFixed(6)}, \${e.latlng.lng.toFixed(6)}
                        </p>
                        <button onclick="confirmLocation(\${e.latlng.lat}, \${e.latlng.lng})" 
                                style="
                                    background: #3b82f6; 
                                    color: white; 
                                    border: none; 
                                    padding: 8px 12px; 
                                    border-radius: 6px; 
                                    margin-top: 8px;
                                    cursor: pointer;
                                    font-weight: bold;
                                ">
                            ✅ Confirm Location
                        </button>
                    </div>
                \`)
                .openPopup();
        });

        // Confirm location function
        function confirmLocation(lat, lng) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'locationSelected',
                lat: lat,
                lng: lng
            }));
        }

        // Set existing location if provided
        ${selectedLocation ? `
            eventMarker = L.marker([${selectedLocation.lat}, ${selectedLocation.lng}], { icon: eventLocationIcon })
                .addTo(map)
                .bindPopup(\`
                    <div style="text-align: center; color: white;">
                        <h3 style="margin: 0 0 8px 0; color: white;">📅 Event Location</h3>
                        <p style="margin: 0; color: #d1d5db; font-size: 14px;">
                            ${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}
                        </p>
                        <p style="margin: 8px 0 0 0; color: #10b981; font-size: 12px; font-weight: bold;">
                            ✅ Currently Selected
                        </p>
                    </div>
                \`);
            map.setView([${selectedLocation.lat}, ${selectedLocation.lng}], ${ZOOM_LEVEL});
        ` : ''}
    </script>
</body>
</html>
    `;
  };

  // Handle messages from WebView
  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'locationSelected') {
        handleLocationSelect({
          lat: data.lat,
          lng: data.lng
        });
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  return (
    <View>
      <Text style={{
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        fontFamily: 'System'
      }}>
        Event Location (Optional)
      </Text>
      
      {/* Location Input/Display */}
      <View style={{ marginBottom: 12 }}>
        {selectedLocation ? (
          <View style={{
            backgroundColor: '#374151',
            borderRadius: 12,
            padding: 12,
            borderWidth: 2,
            borderColor: '#6b7280'
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 'bold',
                  marginBottom: 4,
                  fontFamily: 'System'
                }}>
                  📍 Location Selected
                </Text>
                <Text style={{
                  color: '#9ca3af',
                  fontSize: 12,
                  fontFamily: 'System'
                }}>
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setShowMap(true)}
                  style={{
                    backgroundColor: '#3b82f6',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8
                  }}
                >
                  <Text style={{
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 'bold',
                    fontFamily: 'System'
                  }}>
                    Change
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleClearLocation}
                  style={{
                    backgroundColor: '#ef4444',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8
                  }}
                >
                  <Text style={{
                    color: 'white',
                    fontSize: 12,
                    fontWeight: 'bold',
                    fontFamily: 'System'
                  }}>
                    Clear
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowMap(true)}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 2,
              borderColor: '#6b7280',
              borderRadius: 12,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MapPin size={20} color="#f97316" />
            <Text style={{
              color: '#f97316',
              fontSize: 16,
              fontWeight: 'bold',
              marginLeft: 8,
              fontFamily: 'System'
            }}>
              Select Location on Map
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Map Modal */}
      {showMap && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: -20,
          right: -20,
          bottom: 0,
          zIndex: 1000,
          backgroundColor: '#121212',
          borderRadius: 12,
          overflow: 'hidden',
          height: 400
        }}>
          {/* Header */}
          <View style={{
            backgroundColor: '#1f2937',
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Text style={{
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 'bold',
              fontFamily: 'System'
            }}>
              Select Event Location
            </Text>
            <TouchableOpacity
              onPress={() => setShowMap(false)}
              style={{
                backgroundColor: '#374151',
                borderRadius: 16,
                padding: 8
              }}
            >
              <X size={16} color="white" />
            </TouchableOpacity>
          </View>

          {/* Map */}
          <View style={{ flex: 1 }}>
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
                  <ActivityIndicator size="large" color="#f97316" />
                  <Text style={{
                    color: '#9ca3af',
                    marginTop: 12,
                    fontFamily: 'System'
                  }}>
                    Loading map...
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      )}
    </View>
  );
}

export default EventLocationMap;