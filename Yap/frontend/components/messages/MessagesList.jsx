import React from 'react';
import MessagePerson from './MessagePerson';

function MessagesList({ conversations, selectedConversation, onConversationSelect, loading }) {
    
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div>
                <div>
                    <h2>Messages</h2>
                </div>
                <div>
                    <p>Loading conversations...</p>
                </div>
            </div>
        );
    }

    if (!conversations || conversations.length === 0) {
        return (
            <div>
                <div>
                    <h2>Messages</h2>
                </div>
                <div>
                    <p>No conversations yet</p>
                    <p>Start messaging someone to see conversations here.</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div>
                <h2>Messages</h2>
                <button>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                </button>
            </div>
            
            <div>
                {conversations.map((conversation) => (
                    <MessagePerson
                        key={conversation._id}
                        conversation={conversation}
                        isSelected={selectedConversation?._id === conversation._id}
                        onClick={() => onConversationSelect(conversation)}
                        formatTime={formatTime}
                    />
                ))}
            </div>
        </div>
    );
}

export default MessagesList;