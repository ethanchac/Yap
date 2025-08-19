import { Users, Clock, Target, RefreshCw } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

function WaypointStats({ waypointCount, placementMode, refreshing }) {
    const { isDarkMode } = useTheme();
    
    return (
        <div className={`absolute bottom-4 left-4 rounded-lg p-3 z-[1000] ${
            isDarkMode 
                ? 'bg-black bg-opacity-75 text-white' 
                : 'bg-white bg-opacity-90 text-gray-900 border border-gray-300'
        }`}>
            <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{waypointCount} active</span>
                </div>
                <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Live updates</span>
                </div>
                {placementMode && (
                    <div className="flex items-center space-x-1">
                        <Target className="w-4 h-4 text-orange-400" />
                        <span className="text-orange-400">Placement mode</span>
                    </div>
                )}
                {refreshing && (
                    <div className="flex items-center space-x-1">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Updating...</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default WaypointStats;