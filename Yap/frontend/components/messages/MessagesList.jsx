import { useEffect } from 'react';
import MessagePerson from './MessagePerson';
import { useTheme } from '../../contexts/ThemeContext';
import { messageService } from '../../services/messageService';

function MessagesList({ 
    conversations, 
    selectedConversation, 
    onConversationSelect, 
    loading,
    onConversationsUpdate // Add this prop to refresh conversations
}) {
    const { isDarkMode } = useTheme();
    
    // Mark conversation as read when selected
    useEffect(() => {
        if (selectedConversation?._id) {
            const markAsRead = async () => {
                try {
                    const markedCount = await messageService.markConversationAsRead(selectedConversation._id);
                    console.log('✅ Marked conversation as read:', selectedConversation._id, 'Count:', markedCount);
                    
                    // Refresh conversations to update unread counts
                    if (onConversationsUpdate && markedCount > 0) {
                        onConversationsUpdate();
                    }
                } catch (error) {
                    console.error('❌ Error marking conversation as read:', error);
                }
            };
            
            // Small delay to ensure messages are loaded first
            const timer = setTimeout(markAsRead, 1000);
            return () => clearTimeout(timer);
        }
    }, [selectedConversation?._id, onConversationsUpdate]);
    
    const formatTime = (dateString) => {
        if (!dateString) return '';
        
        try {
            // Ensure we're parsing the timestamp correctly
            const date = new Date(dateString);
            
            // Verify the date is valid
            if (isNaN(date.getTime())) {
                console.log('Invalid date:', dateString);
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
        } catch (error) {
            console.error('Error formatting time:', error, dateString);
            return '';
        }
    };

    // Sort conversations by last_message_at to ensure proper ordering
    const sortedConversations = conversations ? [...conversations].sort((a, b) => {
        const timeA = a.last_message_at || a.created_at;
        const timeB = b.last_message_at || b.created_at;
        
        if (!timeA && !timeB) return 0;
        if (!timeA) return 1;
        if (!timeB) return -1;
        
        // Parse dates and sort in descending order (newest first)
        try {
            return new Date(timeB) - new Date(timeA);
        } catch (error) {
            console.error('Error sorting conversations:', error);
            return 0;
        }
    }) : [];

    if (loading) {
        return (
            <div className="h-full flex flex-col">
                <div className={`p-4 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Messages</h2>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-4"></div>
                        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading conversations...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!conversations || conversations.length === 0) {
        return (
            <div className="h-full flex flex-col">
                <div className={`p-4 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Messages</h2>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                    <div className="mb-4">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`mx-auto ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                            <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <p className={`mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No conversations yet</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Start messaging someone to see conversations here.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className={`p-4 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                <div className="flex items-center justify-between">
                    <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Messages</h2>
                    <div className={`text-sm px-2 py-1 rounded-full ${
                        isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                    }`}>
                        {conversations.length}
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {sortedConversations.map((conversation, index) => {
                    return (
                        <MessagePerson
                            key={conversation._id}
                            conversation={conversation}
                            isSelected={selectedConversation?._id === conversation._id}
                            onClick={() => onConversationSelect(conversation)}
                            formatTime={formatTime}
                        />
                    );
                })}
            </div>
        </div>
    );
}

export default MessagesList;