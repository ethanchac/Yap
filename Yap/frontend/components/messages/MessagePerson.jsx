import { useTheme } from '../../contexts/ThemeContext';

function MessagePerson({ conversation, isSelected, onClick, formatTime }) {
    const { isDarkMode } = useTheme();
    const { other_participant, last_message, last_message_at } = conversation || {};
    
    // Fallback for missing participant data
    const participantName = other_participant?.username || 'Unknown User';
    
    // Get current user ID to check if message is unseen
    const getCurrentUserIdentifier = () => {
        try {
            const userString = localStorage.getItem('user');
            const token = localStorage.getItem('token');

            if (userString) {
                const user = JSON.parse(userString);
                const userId = user._id || user.id || user.userId || user.user_id || user.username;
                if (userId) return String(userId);
            }

            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const tokenIdentifier = payload.userId || payload.id || payload._id || payload.user_id || payload.sub || payload.username;
                    if (tokenIdentifier) return String(tokenIdentifier);
                } catch (e) {}
            }

            return null;
        } catch {
            return null;
        }
    };
    
    // Function to get profile picture URL or default
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
    
    // Format last message preview with better error handling
    const getLastMessagePreview = () => {
        console.log('Last message data:', last_message); // Debug log
        
        // Handle different possible structures
        const content = last_message?.content || 
                       last_message?.message?.content || 
                       last_message?.text;
        
        if (!content) return 'Start a conversation';
        
        if (typeof content !== 'string') return 'Start a conversation';
        
        if (content.length > 40) {
            return content.substring(0, 40) + '...';
        }
        return content;
    };

    // Check if message is unseen (not from current user and conversation not selected)
    const hasUnreadMessages = () => {
        const currentUserId = getCurrentUserIdentifier();
        
        if (!last_message || !currentUserId) return false;
        
        // If this conversation is currently selected, mark as read
        if (isSelected) return false;
        
        // Check if the last message is from someone else
        const lastMessageSenderId = last_message.sender_id || 
                                  last_message.senderId || 
                                  last_message.from ||
                                  last_message.author_id;
        
        console.log('Checking unseen:', {
            lastMessageSenderId,
            currentUserId,
            isFromOther: lastMessageSenderId !== currentUserId,
            isSelected
        });
        
        return lastMessageSenderId && lastMessageSenderId !== currentUserId;
    };

    const isUnseen = hasUnreadMessages();

    return (
        <div 
            onClick={onClick}
            className={`flex items-center p-3 cursor-pointer transition-all duration-200 ${
                isSelected 
                    ? isDarkMode ? 'bg-gray-600' : 'bg-gray-100' 
                    : isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'
            } ${
                isUnseen 
                    ? isDarkMode 
                        ? 'bg-gradient-to-r from-orange-900/20 to-transparent border-l-4 border-orange-500 shadow-lg' 
                        : 'bg-gradient-to-r from-orange-100 to-transparent border-l-4 border-orange-500 shadow-md'
                    : ''
            }`}
        >
            <div className="relative">
                <img 
                    src={getProfilePictureUrl()} 
                    alt={participantName}
                    className={`w-12 h-12 rounded-full object-cover transition-all duration-200 ${
                        isUnseen ? 'ring-2 ring-orange-500 ring-offset-2' : ''
                    } ${
                        isDarkMode ? 'ring-offset-gray-800' : 'ring-offset-white'
                    }`}
                    onError={(e) => {
                        // Fallback to default avatar if image fails to load
                        e.target.src = `http://localhost:5000/static/default/default-avatar.png`;
                    }}
                />
                
                {/* Online status indicator */}
                <div className={`absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 ${
                    isDarkMode ? 'border-gray-700' : 'border-white'
                }`}></div>
                
                {/* Unseen message indicator */}
                {isUnseen && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center animate-pulse">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                )}
            </div>
            
            <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <h3 className={`font-medium truncate ${
                        isUnseen 
                            ? isDarkMode ? 'text-white font-bold' : 'text-gray-900 font-bold'
                            : isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                        {participantName}
                    </h3>
                    {last_message_at && (
                        <span className={`text-xs ml-2 flex-shrink-0 ${
                            isUnseen 
                                ? isDarkMode ? 'text-orange-300 font-semibold' : 'text-orange-600 font-semibold'
                                : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                            {formatTime(last_message_at)}
                        </span>
                    )}
                </div>
                
                <div className="flex items-center justify-between mt-1">
                    <p className={`text-sm truncate pr-2 ${
                        isUnseen 
                            ? isDarkMode ? 'text-gray-200 font-medium' : 'text-gray-700 font-medium'
                            : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                        {getLastMessagePreview()}
                    </p>
                    {isUnseen && (
                        <div className="w-3 h-3 bg-orange-500 rounded-full flex-shrink-0 animate-pulse shadow-lg"></div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MessagePerson;