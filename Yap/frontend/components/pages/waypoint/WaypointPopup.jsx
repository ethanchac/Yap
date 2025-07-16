function WaypointPopup({ waypoint, isOwner, onJoin, onDelete }) {
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

            <p style={{ 
                margin: '0 0 12px 0', 
                color: '#6b7280', 
                fontSize: '14px',
                lineHeight: '1.4'
            }}>
                {waypoint.description}
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
                </div>
            </div>
            
            {/* Action button - different for owner vs others */}
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
                        onClick={() => onJoin(waypoint.id)}
                        style={{
                            flex: 1,
                            padding: '6px 12px',
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                    >
                        Update
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => onJoin(waypoint.id)}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        width: '100%'
                    }}
                >
                    Join Waypoint
                </button>
            )}
        </div>
    );
}

export default WaypointPopup;