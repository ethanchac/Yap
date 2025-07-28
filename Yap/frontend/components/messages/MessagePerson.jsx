import { useTheme } from '../../contexts/ThemeContext';

function MessagePerson({ conversation, isSelected, onClick, formatTime }) {
    const { isDarkMode } = useTheme();
    const { other_participant, last_message, last_message_at } = conversation || {};
    
    // Fallback for missing participant data
    const participantName = other_participant?.username || 'Unknown User';
    
    // Function to get profile picture URL or default - FIXED
    const getProfilePictureUrl = () => {
        const profilePic = other_participant?.profile_picture;
        
        if (profilePic) {
            // If it's already a full URL (like from your upload system), use it directly
            if (profilePic.startsWith('http')) {
                return profilePic;
            }
            // If it's just a filename, construct the full URL
            return `http://localhost:5000/uploads/profile_pictures/${profilePic}`;
        }
        // Default profile picture if none exists
        return `http://localhost:5000/static/default/default-avatar.png`;
    };
    
    // Format last message preview - FIXED: Added safety checks
    const getLastMessagePreview = () => {
        if (!last_message || !last_message.content) return 'Start a conversation';
        
        const content = last_message.content;
        if (typeof content !== 'string') return 'Start a conversation';
        
        if (content.length > 40) {
            return content.substring(0, 40) + '...';
        }
        return content;
    };

    // Check if there are unread messages (you can implement this logic)
    const hasUnreadMessages = false; // Placeholder - implement based on your needs

    return (
        <div 
            onClick={onClick}
            className={`flex items-center p-3 cursor-pointer transition-colors ${
                isSelected 
                    ? isDarkMode ? 'bg-gray-600' : 'bg-gray-100' 
                    : isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'
            }`}
        >
            <div className="relative">
                <img 
                    src={getProfilePictureUrl()} 
                    alt={participantName}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                        // Fallback to default avatar if image fails to load
                        e.target.src = `http://localhost:5000/static/default/default-avatar.png`;
                    }}
                />
                
                {/* Online status indicator */}
                <div className={`absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 ${
                    isDarkMode ? 'border-gray-700' : 'border-white'
                }`}></div>
            </div>
            
            <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <h3 className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{participantName}</h3>
                    {last_message_at && (
                        <span className={`text-xs ml-2 flex-shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatTime(last_message_at)}
                        </span>
                    )}
                </div>
                
                <div className="flex items-center justify-between mt-1">
                    <p className={`text-sm truncate pr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{getLastMessagePreview()}</p>
                    {hasUnreadMessages && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MessagePerson;