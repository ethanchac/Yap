import { MapPin, X, Target, RefreshCw, AlertCircle, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

function WaypointHeader({ 
    placementMode, 
    onTogglePlacementMode, 
    onRefresh, 
    refreshing, 
    waypointCount, 
    error, 
    onClearError,
    onOpenSavedWaypoints,
    isNavigatingSaved = false,
    currentSavedIndex = -1,
    savedWaypointsCount = 0,
    onPreviousSaved,
    onNextSaved,
    onExitSavedNavigation
}) {
    const { isDarkMode } = useTheme();
    
    return (
        <div className="mb-6 flex-shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <MapPin className="w-8 h-8 text-orange-400" />
                    <div>
                        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Waypoint
                        </h1>
                        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                            Real-time campus community map
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    {/* Saved Navigation Controls (shown when navigating) */}
                    {isNavigatingSaved ? (
                        <>
                            <div className="flex items-center space-x-2 px-4 py-2 bg-purple-600 rounded-lg text-white">
                                <Bookmark className="w-4 h-4" />
                                <span className="font-semibold">
                                    Navigating Saved ({currentSavedIndex + 1} of {savedWaypointsCount})
                                </span>
                            </div>
                            
                            <button
                                onClick={onExitSavedNavigation}
                                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                                <span>Exit Navigation</span>
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Saved Waypoints Button */}
                            <button
                                onClick={onOpenSavedWaypoints}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-all transform hover:scale-105 ${
                                    isDarkMode 
                                        ? 'text-white hover:bg-[#1f1f1f] bg-[#1c1c1c]'
                                        : 'text-gray-900 hover:bg-gray-300 bg-gray-200'
                                }`}
                                title="View saved waypoints"
                            >
                                <Bookmark className="w-4 h-4 text-purple-400" />
                                <span>Saved</span>
                            </button>

                            {/* Placement Mode Toggle */}
                            <button
                                onClick={onTogglePlacementMode}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-all transform hover:scale-105 ${
                                    placementMode 
                                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25' 
                                        : isDarkMode
                                            ? 'text-white hover:bg-[#1f1f1f] bg-[#1c1c1c]'
                                            : 'text-gray-900 hover:bg-gray-300 bg-gray-200'
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
                                onClick={onRefresh}
                                disabled={refreshing}
                                className={`flex items-center space-x-2 px-3 py-2 disabled:opacity-50 rounded-lg transition-colors ${
                                    isDarkMode 
                                        ? 'text-white hover:bg-[#1f1f1f] bg-[#1c1c1c]'
                                        : 'text-gray-900 hover:bg-gray-300 bg-gray-200'
                                }`}
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                <span>Refresh</span>
                            </button>
                        </>
                    )}
                    
                    <div className={`text-right text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <div>
                            {isNavigatingSaved ? (
                                <span className="text-purple-400 font-semibold">🔖 Navigating saved waypoints</span>
                            ) : placementMode ? (
                                <span className="text-orange-400 font-semibold">🎯 Click map to place waypoint</span>
                            ) : (
                                <span>📍 Enable placement mode to add waypoints</span>
                            )}
                        </div>
                        <div>🗺️ {waypointCount} active waypoints</div>
                        {isNavigatingSaved && (
                            <div className={`text-xs ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                                Use ← → keys or buttons to navigate
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className={`mt-4 p-3 border rounded-lg ${
                    isDarkMode 
                        ? 'bg-red-900 border-red-600' 
                        : 'bg-red-100 border-red-300'
                }`}>
                    <div className="flex items-center space-x-2">
                        <AlertCircle className={`w-5 h-5 ${
                            isDarkMode ? 'text-red-400' : 'text-red-600'
                        }`} />
                        <span className={isDarkMode ? 'text-red-200' : 'text-red-800'}>
                            {error}
                        </span>
                        <button 
                            onClick={onClearError}
                            className={`ml-auto transition-colors ${
                                isDarkMode 
                                    ? 'text-red-400 hover:text-red-300'
                                    : 'text-red-600 hover:text-red-700'
                            }`}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WaypointHeader;