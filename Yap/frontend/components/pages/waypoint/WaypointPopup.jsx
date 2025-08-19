function WaypointPopup({ waypoint, isOwner, onLike, onBookmark, onDelete, onJoinEvent, currentUserId }) {
    // Check if this is an event waypoint
    const isEventWaypoint = waypoint.type === 'event' || waypoint.title.startsWith('📅');
    
    // Use the pre-calculated isLiked and isBookmarked from the waypoint data
    const isLiked = waypoint.isLiked || false;
    const isBookmarked = waypoint.isBookmarked || false;
    
    // Get event attendance status from waypoint data
    const isAttending = waypoint.isAttending || false;
    const attendeesCount = waypoint.attendeesCount || 0;
    
    // Debug logging for WaypointPopup
    if (isEventWaypoint) {
        console.log(`🔍 WaypointPopup data for "${waypoint.title}":`, {
            isAttending,
            attendeesCount,
            isOwner,
            waypointType: waypoint.type,
            waypointData: {
                isAttending: waypoint.isAttending,
                attendeesCount: waypoint.attendeesCount
            }
        });
    }
    
    // Parse event details from description if it's an event
    const parseEventDetails = (description) => {
        if (!isEventWaypoint) return null;
        
        const lines = description.split('\n');
        const eventLine = lines.find(line => line.startsWith('Event on'));
        
        if (eventLine) {
            const match = eventLine.match(/Event on (\d{4}-\d{2}-\d{2}) at (\d{2}:\d{2})/);
            if (match) {
                const [, date, time] = match;
                const eventDate = new Date(`${date}T${time}`);
                const now = new Date();
                const isUpcoming = eventDate > now;
                
                return {
                    date,
                    time,
                    isUpcoming,
                    eventDate
                };
            }
        }
        return null;
    };

    const eventDetails = parseEventDetails(waypoint.description);

    const handleLike = () => {
        if (!currentUserId) {
            alert('Please log in to like waypoints');
            return;
        }
        
        if (onLike) {
            onLike(waypoint.id);
        }
    };

    const handleBookmark = () => {
        if (!currentUserId) {
            alert('Please log in to bookmark waypoints');
            return;
        }
        
        if (onBookmark) {
            onBookmark(waypoint.id);
        }
    };

    const handleJoinEvent = () => {
        if (!currentUserId) {
            alert('Please log in to join events');
            return;
        }
        
        if (onJoinEvent && isEventWaypoint) {
            // Add some user feedback for better UX
            if (isAttending) {
                const confirmed = window.confirm('Are you sure you want to leave this event?');
                if (!confirmed) return;
            }
            onJoinEvent(waypoint);
        }
    };

    return (
        <div className="font-sans min-w-[200px]">
            {/* Header with optional delete button */}
            <div className="flex justify-between items-start mb-2">
                <h3 className={`m-0 text-gray-800 text-base font-bold flex-1 ${isOwner ? 'pr-2' : ''}`}>
                    {waypoint.title}
                </h3>
                {isOwner && (
                    <button
                        onClick={() => onDelete(waypoint.id, waypoint.title)}
                        className="bg-transparent border-none text-red-500 cursor-pointer text-base p-0.5 rounded leading-none min-w-[20px] h-5 flex items-center justify-center hover:bg-red-50"
                        title={isEventWaypoint ? "Cancel event" : "Delete waypoint"}
                    >
                        🗑️
                    </button>
                )}
            </div>

            {/* Event-specific information */}
            {isEventWaypoint && eventDetails && (
                <div className={`rounded-md p-2 mb-2 border ${
                    eventDetails.isUpcoming 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'bg-yellow-50 border-yellow-300'
                }`}>
                    <div className={`text-xs font-bold mb-1 ${
                        eventDetails.isUpcoming ? 'text-blue-800' : 'text-yellow-800'
                    }`}>
                        {eventDetails.isUpcoming ? '🔜 UPCOMING EVENT' : '⏰ PAST EVENT'}
                    </div>
                    <div className={`text-xs ${
                        eventDetails.isUpcoming ? 'text-blue-800' : 'text-yellow-800'
                    }`}>
                        📅 {eventDetails.date} at {eventDetails.time}
                    </div>
                </div>
            )}

            <p className="m-0 mb-3 text-gray-500 text-sm leading-relaxed">
                {/* For event waypoints, show only the description part (after the date line) */}
                {isEventWaypoint 
                    ? waypoint.description.split('\n').slice(2).join('\n').trim() || waypoint.description
                    : waypoint.description
                }
            </p>
            
            <div className="text-xs text-gray-400 mb-3">
                <div className="mb-1">📅 {waypoint.time}</div>
                <div className="mb-1 flex items-center justify-between">
                    <span>👤 {waypoint.author}</span>
                    {isOwner && (
                        <span className="text-white text-[10px] font-bold bg-emerald-500 px-1.5 py-0.5 rounded-lg">
                            YOUR WAYPOINT
                        </span>
                    )}
                </div>
                {waypoint.distance_km && (
                    <div className="mb-1">📍 {waypoint.distance_km}km away</div>
                )}
                <div className="flex items-center space-x-3 mt-2">
                    <span>👍 {waypoint.interactions?.likes || 0}</span>
                    <span>🔖 {waypoint.interactions?.bookmarks || 0}</span>
                    {isEventWaypoint && (
                        <span>👥 {attendeesCount} attending</span>
                    )}
                </div>
            </div>
            
            {/* Action buttons */}
            <div className="space-y-2">
                {/* Join Event Button (only for event waypoints and if user is not the owner) */}
                {isEventWaypoint && !isOwner && (
                    <button 
                        onClick={handleJoinEvent}
                        className={`w-full px-3 py-2 text-white border-none rounded-md text-sm font-bold cursor-pointer transition-all duration-200 ${
                            isAttending 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        disabled={isAttending && eventDetails && !eventDetails.isUpcoming}
                    >
                        {isAttending ? '✅ Joined (click to leave)' : '🎫 Join Event'}
                    </button>
                )}
                
                {/* Like and Save buttons */}
                <div className="flex gap-1.5">
                    <button 
                        onClick={handleLike}
                        className={`flex-1 px-3 py-1.5 text-white border-none rounded-md text-xs font-bold cursor-pointer transition-all duration-200 ${
                            isLiked ? 'bg-emerald-500' : 'bg-orange-500 hover:bg-orange-600'
                        }`}
                    >
                        {isLiked ? '❤️ Liked' : '🤍 Like'}
                    </button>
                    <button 
                        onClick={handleBookmark}
                        className={`flex-1 px-3 py-1.5 text-white border-none rounded-md text-xs font-bold cursor-pointer transition-all duration-200 ${
                            isBookmarked ? 'bg-violet-500' : 'bg-orange-500 hover:bg-orange-600'
                        }`}
                    >
                        {isBookmarked ? '🔖 Saved' : '📖 Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default WaypointPopup;