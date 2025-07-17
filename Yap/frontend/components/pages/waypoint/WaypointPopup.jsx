function WaypointPopup({ waypoint, isOwner, onLike, onBookmark, onDelete, currentUserId }) {
    // Check if this is an event waypoint
    const isEventWaypoint = waypoint.type === 'event' || waypoint.title.startsWith('📅');
    
    // Check if user has liked or bookmarked this waypoint
    const isLiked = waypoint.liked_users?.includes(currentUserId) || false;
    const isBookmarked = waypoint.bookmarked_users?.includes(currentUserId) || false;
    
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
        if (onLike) {
            onLike(waypoint.id);
        }
    };

    const handleBookmark = () => {
        if (onBookmark) {
            onBookmark(waypoint.id);
        }
    };

    return (
        <div style={{ fontFamily: 'Albert Sans, sans-serif', minWidth: '200px' }}>
            {/* Header with optional delete button */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '8px'
            }}>
                <h3 style={{ 
                    margin: '0', 
                    color: '#1f2937', 
                    fontSize: '16px',
                    fontWeight: 'bold',
                    flex: 1,
                    paddingRight: isOwner ? '8px' : '0'
                }}>
                    {waypoint.title}
                </h3>
                {isOwner && (
                    <button
                        onClick={() => onDelete(waypoint.id, waypoint.title)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '16px',
                            padding: '2px',
                            borderRadius: '4px',
                            lineHeight: 1,
                            minWidth: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="Delete waypoint"
                    >
                        🗑️
                    </button>
                )}
            </div>

            {/* Event-specific information */}
            {isEventWaypoint && eventDetails && (
                <div style={{
                    backgroundColor: eventDetails.isUpcoming ? '#dbeafe' : '#fef3c7',
                    border: `1px solid ${eventDetails.isUpcoming ? '#93c5fd' : '#fcd34d'}`,
                    borderRadius: '6px',
                    padding: '8px',
                    marginBottom: '8px'
                }}>
                    <div style={{ 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        color: eventDetails.isUpcoming ? '#1e40af' : '#92400e',
                        marginBottom: '4px'
                    }}>
                        {eventDetails.isUpcoming ? '🔜 UPCOMING EVENT' : '⏰ PAST EVENT'}
                    </div>
                    <div style={{ 
                        fontSize: '12px', 
                        color: eventDetails.isUpcoming ? '#1e40af' : '#92400e'
                    }}>
                        📅 {eventDetails.date} at {eventDetails.time}
                    </div>
                </div>
            )}

            <p style={{ 
                margin: '0 0 12px 0', 
                color: '#6b7280', 
                fontSize: '14px',
                lineHeight: '1.4'
            }}>
                {/* For event waypoints, show only the description part (after the date line) */}
                {isEventWaypoint 
                    ? waypoint.description.split('\n').slice(2).join('\n').trim() || waypoint.description
                    : waypoint.description
                }
            </p>
            
            <div style={{ 
                fontSize: '12px', 
                color: '#9ca3af',
                marginBottom: '12px'
            }}>
                <div style={{ marginBottom: '4px' }}>📅 {waypoint.time}</div>
                <div style={{ 
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>👤 {waypoint.author}</span>
                    {isOwner && (
                        <span style={{ 
                            color: '#10b981', 
                            fontSize: '10px',
                            fontWeight: 'bold',
                            background: '#10b981',
                            color: 'white',
                            padding: '1px 6px',
                            borderRadius: '8px'
                        }}>
                            YOUR WAYPOINT
                        </span>
                    )}
                </div>
                {waypoint.distance_km && (
                    <div style={{ marginBottom: '4px' }}>📍 {waypoint.distance_km}km away</div>
                )}
                <div className="flex items-center space-x-3 mt-2">
                    <span>👍 {waypoint.interactions?.likes || 0}</span>
                    <span>🤝 {waypoint.interactions?.joins || 0}</span>
                    <span>🔖 {waypoint.interactions?.bookmarks || 0}</span>
                </div>
            </div>
            
            {/* Action buttons */}
            {isOwner ? (
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                        onClick={() => onDelete(waypoint.id, waypoint.title)}
                        style={{
                            flex: 1,
                            padding: '6px 12px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Delete
                    </button>
                    <button 
                        onClick={handleLike}
                        style={{
                            flex: 1,
                            padding: '6px 12px',
                            backgroundColor: isLiked ? '#ef4444' : '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        {isLiked ? '❤️ Liked' : '🤍 Like'}
                    </button>
                    <button 
                        onClick={handleBookmark}
                        style={{
                            flex: 1,
                            padding: '6px 12px',
                            backgroundColor: isBookmarked ? '#f59e0b' : '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        {isBookmarked ? '🔖 Saved' : '📖 Save'}
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                        onClick={handleLike}
                        style={{
                            flex: 1,
                            padding: '6px 12px',
                            backgroundColor: isLiked ? '#ef4444' : '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        {isLiked ? '❤️ Liked' : '🤍 Like'}
                    </button>
                    <button 
                        onClick={handleBookmark}
                        style={{
                            flex: 1,
                            padding: '6px 12px',
                            backgroundColor: isBookmarked ? '#f59e0b' : '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        {isBookmarked ? '🔖 Saved' : '📖 Save'}
                    </button>
                </div>
            )}
        </div>
    );
}

export default WaypointPopup;