import { MapPin, X, Target, RefreshCw, AlertCircle } from 'lucide-react';

function WaypointHeader({ 
    placementMode, 
    onTogglePlacementMode, 
    onRefresh, 
    refreshing, 
    waypointCount, 
    error, 
    onClearError 
}) {
    return (
        <div className="mb-6 flex-shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <MapPin className="w-8 h-8 text-orange-400" />
                    <div>
                        <h1 className="text-white text-3xl font-bold">Waypoint</h1>
                        <p className="text-gray-400">Real-time campus community map</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    {/* Placement Mode Toggle */}
                    <button
                        onClick={onTogglePlacementMode}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold transition-all transform hover:scale-105 ${
                            placementMode 
                                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25' 
                                : 'text-white hover:bg-gray-600'
                        }`}
                        style={{
                            backgroundColor: placementMode ? '' : '#171717'
                        }}
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
                        className="flex items-center space-x-2 px-3 py-2 disabled:opacity-50 text-white rounded-lg transition-colors hover:bg-gray-600"
                        style={{
                            backgroundColor: '#171717'
                        }}
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
                        <div>🗺️ {waypointCount} active waypoints</div>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mt-4 p-3 bg-red-900 border border-red-600 rounded-lg">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <span className="text-red-200">{error}</span>
                        <button 
                            onClick={onClearError}
                            className="ml-auto text-red-400 hover:text-red-300"
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