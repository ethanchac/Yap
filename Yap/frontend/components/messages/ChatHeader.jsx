import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE_URL } from '../../services/config';

function ChatHeader({ conversation, getProfilePictureUrl, connectionStatus, typingUsers = [] }) {
    const { isDarkMode } = useTheme();

    // Get typing status text
    const getTypingText = () => {
        if (typingUsers.length === 0) return null;
        
        if (typingUsers.length === 1) {
            return `${typingUsers[0].username} is typing...`;
        } else if (typingUsers.length === 2) {
            return `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`;
        } else {
            return `${typingUsers.length} people are typing...`;
        }
    };

    // Get connection status indicator
    const getConnectionStatusIndicator = () => {
        switch (connectionStatus) {
            case 'connected':
                return (
                    <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-green-400 text-sm">Online</span>
                    </div>
                );
            case 'disconnected':
                return (
                    <div className="flex items-center">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                        <span className="text-yellow-400 text-sm">Reconnecting...</span>
                    </div>
                );
            case 'failed':
                return (
                    <div className="flex items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-red-400 text-sm">Offline</span>
                    </div>
                );
            default:
                return (
                    <div className="flex items-center">
                        <div className="w-2 h-2 bg-gray-500 rounded-full mr-2"></div>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Unknown
                        </span>
                    </div>
                );
        }
    };

    const typingText = getTypingText();

    return (
        <div className={`border-b p-4 flex items-center justify-between ${
            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
        }`}>
            <div className="flex items-center flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                    <img 
                        src={getProfilePictureUrl(conversation.other_participant?.profile_picture)}
                        alt={conversation.other_participant?.username || 'Unknown User'}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                            e.target.src = `${API_BASE_URL}/static/default/default-avatar.png`;
                        }}
                    />
                    
                    {/* Online status indicator on avatar */}
                    {connectionStatus === 'connected' && conversation.other_participant?.online && (
                        <div className={`absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 ${
                            isDarkMode ? 'border-gray-700' : 'border-gray-100'
                        }`}></div>
                    )}
                </div>
                
                <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center">
                        <h3 className={`font-semibold truncate ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                            {conversation.other_participant?.username || 'Unknown User'}
                        </h3>
                        
                        {/* Verified badge or other status indicators */}
                        {conversation.other_participant?.verified && (
                            <svg className="w-4 h-4 ml-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        )}
                    </div>
                    
                    {/* Status line - shows typing or connection status */}
                    <div className="mt-1">
                        {typingText ? (
                            <p className="text-orange-400 text-sm animate-pulse">
                                {typingText}
                            </p>
                        ) : (
                            getConnectionStatusIndicator()
                        )}
                    </div>
                </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-3 flex-shrink-0">
                {/* Call button */}
                <button 
                    className={`p-2 rounded-full transition-colors ${
                        isDarkMode 
                            ? 'text-gray-400 hover:text-white hover:bg-gray-600' 
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                    title="Voice call (coming soon)"
                    disabled={connectionStatus !== 'connected'}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                </button>
                
                {/* Video call button */}
                <button 
                    className={`p-2 rounded-full transition-colors ${
                        isDarkMode 
                            ? 'text-gray-400 hover:text-white hover:bg-gray-600' 
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                    title="Video call (coming soon)"
                    disabled={connectionStatus !== 'connected'}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="23 7 16 12 23 17 23 7" fill="currentColor"/>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                    </svg>
                </button>
                
                {/* More options button */}
                <button 
                    className={`p-2 rounded-full transition-colors ${
                        isDarkMode 
                            ? 'text-gray-400 hover:text-white hover:bg-gray-600' 
                            : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                    }`}
                    title="More options"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="1" fill="currentColor"/>
                        <circle cx="19" cy="12" r="1" fill="currentColor"/>
                        <circle cx="5" cy="12" r="1" fill="currentColor"/>
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default ChatHeader;