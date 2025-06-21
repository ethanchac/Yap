import React from 'react';

function MessagePerson({ conversation, isSelected, onClick, formatTime }) {
    const { other_participant, last_message, last_message_at } = conversation;
    
    // Fallback for missing participant data
    const participantName = other_participant?.username || 'Unknown User';
    const participantPicture = other_participant?.profile_picture || '/default-avatar.png';
    
    // Format last message preview
    const getLastMessagePreview = () => {
        if (!last_message) return 'Start a conversation';
        
        const content = last_message.content;
        if (content.length > 50) {
            return content.substring(0, 50) + '...';
        }
        return content;
    };

    // Check if there are unread messages (you can implement this logic)
    const hasUnreadMessages = false; // Placeholder - implement based on your needs

    return (
        <div onClick={onClick}>
            <div>
                <img 
                    src={participantPicture} 
                    alt={participantName}
                    width="56"
                    height="56"
                    onError={(e) => {
                        e.target.src = '/default-avatar.png';
                    }}
                />
                
                {/* Online status indicator - you can implement this */}
                <div></div>
            </div>
            
            <div>
                <div>
                    <h3>{participantName}</h3>
                    {last_message_at && (
                        <span>{formatTime(last_message_at)}</span>
                    )}
                </div>
                
                <div>
                    <p>{getLastMessagePreview()}</p>
                    {hasUnreadMessages && (
                        <div></div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MessagePerson;