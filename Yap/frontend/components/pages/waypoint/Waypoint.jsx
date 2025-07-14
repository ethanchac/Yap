import { useState, useEffect } from 'react';
import Sidebar from '../../sidebar/Sidebar.jsx';
import { MapPin, Users, Clock, Plus, AlertCircle } from 'lucide-react';

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
    const [pins, setPins] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPinLocation, setNewPinLocation] = useState(null);

    // TMU Campus coordinates
    const TMU_COORDS = [43.6577, -79.3788];
    const ZOOM_LEVEL = 16;

    // Load sample data
    useEffect(() => {
        const samplePins = [
            {
                id: 1,
                coords: [43.6580, -79.3785],
                title: "Free Pizza Here! 🍕",
                description: "Pizza party in the student center - come grab a slice!",
                type: "food",
                time: "2 hours ago",
                author: "StudentCouncil",
                active: true
            },
            {
                id: 2,
                coords: [43.6574, -79.3792],
                title: "Quiet Study Spot 📚",
                description: "Perfect corner in the library, very quiet with good wifi",
                type: "study",
                time: "30 minutes ago",
                author: "StudyBuddy",
                active: true
            },
            {
                id: 3,
                coords: [43.6582, -79.3780],
                title: "Math Study Group 👥",
                description: "Calculus study group, all levels welcome!",
                type: "group",
                time: "1 hour ago",
                author: "MathWiz",
                active: true
            }
        ];
        setPins(samplePins);
    }, []);

    const handleCreatePin = (pinData) => {
        const newPin = {
            id: Date.now(),
            coords: [newPinLocation.lat, newPinLocation.lng],
            ...pinData,
            time: "just now",
            author: "You", // Replace with actual user
            active: true
        };
        
        setPins(prev => [...prev, newPin]);
        setShowCreateModal(false);
        setNewPinLocation(null);
    };

    // Custom icons for different pin types
    const createCustomIcon = (type) => {
        const getColor = (type) => {
            switch (type) {
                case 'food': return '#f59e0b';
                case 'study': return '#3b82f6';
                case 'group': return '#10b981';
                default: return '#6b7280';
            }
        };

        const getEmoji = (type) => {
            switch (type) {
                case 'food': return '🍕';
                case 'study': return '📚';
                case 'group': return '👥';
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
                setNewPinLocation(e.latlng);
                setShowCreateModal(true);
            }
        });
        return null;
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
                                <div className="text-right text-sm text-gray-400">
                                    <div>📍 Click anywhere to add a waypoint</div>
                                    <div>🗺️ {pins.length} active waypoints</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Map Container */}
                    <div className="flex-1 relative rounded-lg overflow-hidden" style={{backgroundColor: '#171717', minHeight: '600px'}}>
                        <MapContainer
                            center={TMU_COORDS}
                            zoom={ZOOM_LEVEL}
                            style={{ height: '100%', width: '100%', minHeight: '600px' }}
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
                            {pins.map((pin) => (
                                <Marker 
                                    key={pin.id} 
                                    position={pin.coords} 
                                    icon={createCustomIcon(pin.type)}
                                >
                                    <Popup maxWidth={250}>
                                        <div style={{ fontFamily: 'Albert Sans, sans-serif', minWidth: '200px' }}>
                                            <h3 style={{ 
                                                margin: '0 0 8px 0', 
                                                color: '#1f2937', 
                                                fontSize: '16px',
                                                fontWeight: 'bold'
                                            }}>
                                                {pin.title}
                                            </h3>
                                            <p style={{ 
                                                margin: '0 0 12px 0', 
                                                color: '#6b7280', 
                                                fontSize: '14px',
                                                lineHeight: '1.4'
                                            }}>
                                                {pin.description}
                                            </p>
                                            <div style={{ 
                                                fontSize: '12px', 
                                                color: '#9ca3af',
                                                marginBottom: '12px'
                                            }}>
                                                <div style={{ marginBottom: '4px' }}>📅 {pin.time}</div>
                                                <div>👤 {pin.author}</div>
                                            </div>
                                            <button style={{
                                                padding: '6px 12px',
                                                backgroundColor: '#f59e0b',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                width: '100%'
                                            }}>
                                                Join Waypoint
                                            </button>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}

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
                            </div>
                        </div>

                        {/* Live Stats */}
                        <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white rounded-lg p-3 z-[1000]">
                            <div className="flex items-center space-x-4 text-sm">
                                <div className="flex items-center space-x-1">
                                    <Users className="w-4 h-4" />
                                    <span>{pins.length} pins</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <Clock className="w-4 h-4" />
                                    <span>Live updates</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Create Pin Modal */}
                    {showCreateModal && (
                        <CreatePinModal 
                            onClose={() => setShowCreateModal(false)}
                            onSubmit={handleCreatePin}
                            location={newPinLocation}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// Simple Create Pin Modal Component
function CreatePinModal({ onClose, onSubmit, location }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('food');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (title.trim() && description.trim()) {
            onSubmit({ title, description, type });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
            <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Create Waypoint</h2>
                <p className="text-sm text-gray-600 mb-4">
                    📍 {location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}
                </p>
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Type
                        </label>
                        <select 
                            value={type} 
                            onChange={(e) => setType(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                        >
                            <option value="food">🍕 Food & Events</option>
                            <option value="study">📚 Study Spot</option>
                            <option value="group">👥 Group & Social</option>
                        </select>
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Free coffee here!"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500"
                            required
                        />
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tell others what's happening here..."
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-orange-500 h-20 resize-none"
                            required
                        />
                    </div>
                    
                    <div className="flex space-x-3">
                        <button
                            type="submit"
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                            Create Waypoint
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Waypoint;