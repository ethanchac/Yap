import { useState, useEffect } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, X, MapPin } from 'lucide-react';

function SavedWaypointsNavigator({ 
    isOpen, 
    onClose, 
    onNavigateToWaypoint,
    getCurrentUserId,
    API_BASE_URL,
    getAuthHeaders 
}) {
    const [savedWaypoints, setSavedWaypoints] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch user's bookmarked waypoints
    const fetchSavedWaypoints = async () => {
        try {
            setLoading(true);
            setError(null);

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
                setCurrentIndex(0);
                // Navigate to first waypoint
                onNavigateToWaypoint(data.waypoints[0], 0);
            }
        } catch (err) {
            console.error('Error fetching saved waypoints:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Navigate to previous waypoint
    const goToPrevious = () => {
        if (savedWaypoints.length === 0) return;
        
        const newIndex = currentIndex > 0 ? currentIndex - 1 : savedWaypoints.length - 1;
        setCurrentIndex(newIndex);
        onNavigateToWaypoint(savedWaypoints[newIndex], newIndex);
    };

    // Navigate to next waypoint
    const goToNext = () => {
        if (savedWaypoints.length === 0) return;
        
        const newIndex = currentIndex < savedWaypoints.length - 1 ? currentIndex + 1 : 0;
        setCurrentIndex(newIndex);
        onNavigateToWaypoint(savedWaypoints[newIndex], newIndex);
    };

    // Load saved waypoints when component opens
    useEffect(() => {
        if (isOpen) {
            const currentUserId = getCurrentUserId();
            if (!currentUserId) {
                setError('Please log in to view saved waypoints');
                return;
            }
            fetchSavedWaypoints();
        }
    }, [isOpen]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goToPrevious();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                goToNext();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex, savedWaypoints.length]);

    if (!isOpen) return null;

    const currentWaypoint = savedWaypoints[currentIndex];

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
            {/* Background overlay */}
            <div 
                className="absolute inset-0"
                style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)'
                }}
                onClick={onClose}
            />
            
            {/* Navigator content */}
            <div className="relative z-10 bg-white rounded-xl shadow-2xl p-6 w-96 max-w-[90vw] m-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                            <Bookmark className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Saved Waypoints</h2>
                            <p className="text-sm text-gray-500">Navigate through your bookmarks</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Loading state */}
                {loading && (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
                        <p className="text-gray-600">Loading saved waypoints...</p>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="text-center py-8">
                        <div className="text-red-500 mb-4">⚠️</div>
                        <p className="text-red-600 mb-4">{error}</p>
                        <button
                            onClick={fetchSavedWaypoints}
                            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* No saved waypoints */}
                {!loading && !error && savedWaypoints.length === 0 && (
                    <div className="text-center py-8">
                        <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">No saved waypoints yet</p>
                        <p className="text-sm text-gray-400">Bookmark waypoints to see them here</p>
                    </div>
                )}

                {/* Waypoint navigation */}
                {!loading && !error && savedWaypoints.length > 0 && currentWaypoint && (
                    <div>
                        {/* Navigation counter */}
                        <div className="text-center mb-4">
                            <span className="text-sm text-gray-500">
                                {currentIndex + 1} of {savedWaypoints.length}
                            </span>
                        </div>

                        {/* Current waypoint info */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                    <MapPin className="w-5 h-5 text-purple-500 mt-1" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 truncate">
                                        {currentWaypoint.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                        {currentWaypoint.description}
                                    </p>
                                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                        <span>👤 {currentWaypoint.username}</span>
                                        <span>📅 {currentWaypoint.time_ago}</span>
                                        <span className="capitalize">
                                            {currentWaypoint.type === 'food' && '🍕'}
                                            {currentWaypoint.type === 'study' && '📚'}
                                            {currentWaypoint.type === 'group' && '👥'}
                                            {currentWaypoint.type === 'social' && '🎉'}
                                            {currentWaypoint.type === 'event' && '📅'}
                                            {currentWaypoint.type === 'other' && '📍'}
                                            {' '}{currentWaypoint.type}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation controls */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={goToPrevious}
                                disabled={savedWaypoints.length <= 1}
                                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>Previous</span>
                            </button>

                            <div className="flex space-x-1">
                                {savedWaypoints.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            setCurrentIndex(index);
                                            onNavigateToWaypoint(savedWaypoints[index], index);
                                        }}
                                        className={`w-2 h-2 rounded-full transition-all ${
                                            index === currentIndex 
                                                ? 'bg-purple-500' 
                                                : 'bg-gray-300 hover:bg-gray-400'
                                        }`}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={goToNext}
                                disabled={savedWaypoints.length <= 1}
                                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg transition-colors"
                            >
                                <span>Next</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Keyboard hints for left and right */}
                        <div className="mt-4 text-center text-xs text-gray-400">
                            Use ← → arrow keys to navigate • ESC to close
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SavedWaypointsNavigator;