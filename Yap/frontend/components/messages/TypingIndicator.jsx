import { useTheme } from '../../contexts/ThemeContext';

function TypingIndicator({ typingUsers = [] }) {
    const { isDarkMode } = useTheme();

    if (typingUsers.length === 0) return null;

    return (
        <div className={`inline-flex items-center px-4 py-2 rounded-2xl ${
            isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
        }`}>
            {/* Animated dots */}
            <div className="flex space-x-1 mr-2">
                <div 
                    className={`w-2 h-2 rounded-full animate-bounce ${
                        isDarkMode ? 'bg-gray-400' : 'bg-gray-500'
                    }`}
                    style={{ animationDelay: '0ms' }}
                ></div>
                <div 
                    className={`w-2 h-2 rounded-full animate-bounce ${
                        isDarkMode ? 'bg-gray-400' : 'bg-gray-500'
                    }`}
                    style={{ animationDelay: '150ms' }}
                ></div>
                <div 
                    className={`w-2 h-2 rounded-full animate-bounce ${
                        isDarkMode ? 'bg-gray-400' : 'bg-gray-500'
                    }`}
                    style={{ animationDelay: '300ms' }}
                ></div>
            </div>
            
            {/* Typing text */}
            <span className={`text-xs ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
                {typingUsers.length === 1 
                    ? `${typingUsers[0].username || 'Someone'} is typing...`
                    : typingUsers.length === 2
                    ? `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`
                    : `${typingUsers.length} people are typing...`
                }
            </span>
        </div>
    );
}

export default TypingIndicator;