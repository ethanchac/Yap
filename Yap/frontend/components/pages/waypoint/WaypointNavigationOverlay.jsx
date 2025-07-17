import { ChevronLeft, ChevronRight } from 'lucide-react';

function WaypointNavigationOverlay({ 
    isVisible, 
    currentWaypoint, 
    currentIndex, 
    totalCount, 
    onPrevious, 
    onNext 
}) {
    if (!isVisible || !currentWaypoint) return null;

    return (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-[1000]">
            <div className="bg-white rounded-lg shadow-lg border-2 border-purple-500 px-4 py-3 flex items-center space-x-4 min-w-96 max-w-2xl">
                {/* Previous Button */}
                <button
                    onClick={onPrevious}
                    disabled={totalCount <= 1}
                    className="flex items-center justify-center w-10 h-10 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-all transform hover:scale-105"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Waypoint Info */}
                <div className="flex-1 text-center min-w-0">
                    <div className="text-sm text-gray-500 font-medium mb-1">
                        Saved Waypoint {currentIndex + 1} of {totalCount}
                    </div>
                    <div className="text-lg font-bold text-gray-900 truncate" title={currentWaypoint.title}>
                        {currentWaypoint.title}
                    </div>
                    <div className="text-sm text-gray-600 truncate" title={currentWaypoint.description}>
                        {currentWaypoint.description}
                    </div>
                    <div className="flex items-center justify-center space-x-3 mt-2 text-xs text-gray-500">
                        <span>
                            {currentWaypoint.type === 'food' && '🍕'}
                            {currentWaypoint.type === 'study' && '📚'}
                            {currentWaypoint.type === 'group' && '👥'}
                            {currentWaypoint.type === 'social' && '🎉'}
                            {currentWaypoint.type === 'event' && '📅'}
                            {currentWaypoint.type === 'other' && '📍'}
                            {' '}{currentWaypoint.type}
                        </span>
                        <span>👤 {currentWaypoint.author || currentWaypoint.username}</span>
                        <span>📅 {currentWaypoint.time || currentWaypoint.time_ago}</span>
                    </div>
                </div>

                {/* Next Button */}
                <button
                    onClick={onNext}
                    disabled={totalCount <= 1}
                    className="flex items-center justify-center w-10 h-10 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-all transform hover:scale-105"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Navigation Dots */}
            {totalCount > 1 && (
                <div className="flex justify-center space-x-1 mt-2">
                    {Array.from({ length: Math.min(totalCount, 10) }, (_, index) => {
                        // Show dots for first 5, current position, and last 5 if more than 10 waypoints
                        let dotIndex = index;
                        if (totalCount > 10) {
                            if (index < 5) {
                                dotIndex = index;
                            } else if (index === 5 && currentIndex > 4 && currentIndex < totalCount - 5) {
                                dotIndex = currentIndex;
                            } else {
                                dotIndex = totalCount - (10 - index);
                            }
                        }
                        
                        return (
                            <div
                                key={index}
                                className={`w-2 h-2 rounded-full transition-all ${
                                    dotIndex === currentIndex 
                                        ? 'bg-purple-500 scale-125' 
                                        : 'bg-gray-300'
                                }`}
                            />
                        );
                    })}
                </div>
            )}

            {/* Keyboard hint */}
            <div className="text-center mt-2 text-xs text-gray-500 bg-black bg-opacity-75 text-white px-2 py-1 rounded">
                Use ← → keys to navigate • ESC to exit
            </div>
        </div>
    );
}

export default WaypointNavigationOverlay;