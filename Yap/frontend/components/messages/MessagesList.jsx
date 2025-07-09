import MessagePerson from './MessagePerson';

function MessagesList({ conversations, selectedConversation, onConversationSelect, loading }) {
    
    const formatTime = (dateString) => {
        // Ensure we're parsing the UTC timestamp correctly
        // If the server sends ISO string with 'Z' suffix, Date constructor handles it properly
        // If not, we need to be explicit about UTC
        const date = new Date(dateString);
        
        // Verify the date is valid
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        
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

    // Sort conversations by last_message_at to ensure proper ordering
    const sortedConversations = conversations ? [...conversations].sort((a, b) => {
        const timeA = a.last_message_at || a.created_at;
        const timeB = b.last_message_at || b.created_at;
        
        // Parse dates and sort in descending order (newest first)
        return new Date(timeB) - new Date(timeA);
    }) : [];

    if (loading) {
        return (
            <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-600">
                    <h2 className="text-white text-lg font-semibold">Messages</h2>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-gray-400">Loading conversations...</p>
                </div>
            </div>
        );
    }

    if (!conversations || conversations.length === 0) {
        return (
            <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-600">
                    <h2 className="text-white text-lg font-semibold">Messages</h2>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                    <p className="text-gray-400 mb-2">No conversations yet</p>
                    <p className="text-gray-500 text-sm">Start messaging someone to see conversations here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-600">
                <h2 className="text-white text-lg font-semibold">Messages</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {sortedConversations.map((conversation) => (
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