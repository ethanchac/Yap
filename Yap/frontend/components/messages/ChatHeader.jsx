import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { getDefaultProfilePicture } from '../../utils/profileUtils';

function ChatHeader({ conversation, getProfilePictureUrl, typingUsers = [] }) {
    const { isDarkMode } = useTheme();
    const navigate = useNavigate();

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


    const typingText = getTypingText();

    return (
        <div className={`border-b p-4 flex items-center justify-between ${
            isDarkMode ? 'bg-[#171717] border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
            <div className="flex items-center flex-1 min-w-0">
                <div 
                    className="relative flex-shrink-0 cursor-pointer"
                    onClick={() => navigate(`/profile/${conversation.other_participant?._id}`)}
                >
                    <img 
                        src={getProfilePictureUrl(conversation.other_participant?.profile_picture)}
                        alt={conversation.other_participant?.username || 'Unknown User'}
                        className="w-10 h-10 rounded-full object-cover hover:opacity-80 transition-opacity"
                        onError={(e) => {
                            e.target.src = getDefaultProfilePicture();
                        }}
                    />
                    
                </div>
                
                <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center">
                        <h3 
                            className={`font-semibold truncate cursor-pointer hover:opacity-80 transition-opacity ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}
                            onClick={() => navigate(`/profile/${conversation.other_participant?._id}`)}
                        >
                            {conversation.other_participant?.username || 'Unknown User'}
                        </h3>
                        
                        {/* Verified badge or other status indicators */}
                        {conversation.other_participant?.verified && (
                            <svg className="w-4 h-4 ml-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        )}
                    </div>
                    
                    {/* Status line - shows only typing */}
                    {typingText && (
                        <div className="mt-1">
                            <p className="text-orange-400 text-sm animate-pulse">
                                {typingText}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            
        </div>
    );
}

export default ChatHeader;