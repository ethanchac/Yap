import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { formatMessageTime } from './utils/easternTimeUtils';

function MessageBubble({ 
    message, 
    isMyMessage, 
    isFirstInGroup = true,
    isLastInGroup = true,
    showAvatar = true,
    showSender = true,
    getProfilePictureUrl 
}) {
    const [showTime, setShowTime] = useState(false);
    const { isDarkMode } = useTheme();

    const toggleTimeDisplay = () => {
        setShowTime(!showTime);
    };

    // Get message status
    const getMessageStatus = () => {
        if (message.isOptimistic) {
            return 'sending';
        }
        if (message.isQueued) {
            return 'queued';
        }
        if (message.failed) {
            return 'failed';
        }
        return 'sent';
    };

    const messageStatus = getMessageStatus();

    // Status icon component
    const StatusIcon = () => {
        switch (messageStatus) {
            case 'sending':
                return (
                    <div className="w-3 h-3 animate-spin border border-gray-400 border-t-transparent rounded-full ml-1"></div>
                );
            case 'queued':
                return (
                    <svg className="w-3 h-3 text-yellow-500 ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                );
            case 'failed':
                return (
                    <svg className="w-3 h-3 text-red-500 ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                );
            case 'sent':
                return (
                    <svg className="w-3 h-3 text-gray-400 ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                );
            default:
                return null;
        }
    };

    // Get bubble styling - UPDATED for better sizing
    const getBubbleStyles = () => {
        // Changed max-w-full to specific max widths and added inline-block for content sizing
        let baseStyles = "inline-block max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl px-3 py-2 break-words cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-sm";
        
        if (isMyMessage) {
            baseStyles += ` ${isDarkMode ? 'bg-orange-600 text-white' : 'bg-orange-500 text-white'}`;
            
            // Rounded corners for my messages (right side)
            if (isFirstInGroup && isLastInGroup) {
                baseStyles += " rounded-2xl";
            } else if (isFirstInGroup) {
                baseStyles += " rounded-2xl rounded-br-md";
            } else if (isLastInGroup) {
                baseStyles += " rounded-2xl rounded-tr-md";
            } else {
                baseStyles += " rounded-l-2xl rounded-r-md";
            }
        } else {
            baseStyles += ` ${isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-900'}`;
            
            // Rounded corners for other messages (left side)
            if (isFirstInGroup && isLastInGroup) {
                baseStyles += " rounded-2xl";
            } else if (isFirstInGroup) {
                baseStyles += " rounded-2xl rounded-bl-md";
            } else if (isLastInGroup) {
                baseStyles += " rounded-2xl rounded-tl-md";
            } else {
                baseStyles += " rounded-r-2xl rounded-l-md";
            }
        }

        // Add opacity for optimistic messages
        if (message.isOptimistic) {
            baseStyles += " opacity-70";
        }

        // Add border for failed messages
        if (messageStatus === 'failed') {
            baseStyles += " border-2 border-red-500";
        }

        return baseStyles;
    };

    return (
        <div className={`group relative ${isMyMessage ? 'text-right' : 'text-left'}`}>
            <div 
                className={getBubbleStyles()}
                onClick={toggleTimeDisplay}
                title="Click to show timestamp"
            >
                {/* Message content */}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                </div>

                {/* Edited indicator */}
                {message.edited && (
                    <span className={`text-xs italic ml-2 opacity-75 ${
                        isMyMessage 
                            ? 'text-orange-200' 
                            : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                        (edited)
                    </span>
                )}
            </div>

            {/* Message metadata */}
            <div className={`flex items-center mt-1 px-1 ${
                isMyMessage ? 'justify-end' : 'justify-start'
            }`}>
                {/* Timestamp */}
                {(showTime || isLastInGroup) && (
                    <span className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                        {formatMessageTime(message.created_at)}
                    </span>
                )}

                {/* Status icon for my messages */}
                {isMyMessage && isLastInGroup && (
                    <div className="flex items-center">
                        <StatusIcon />
                    </div>
                )}
            </div>

            {/* Error message for failed messages */}
            {messageStatus === 'failed' && (
                <div className={`text-xs mt-1 px-1 ${
                    isMyMessage ? 'text-right' : 'text-left'
                }`}>
                    <span className="text-red-500">
                        Failed to send. Tap to retry.
                    </span>
                </div>
            )}

            {/* Queued message indicator */}
            {messageStatus === 'queued' && (
                <div className={`text-xs mt-1 px-1 ${
                    isMyMessage ? 'text-right' : 'text-left'
                }`}>
                    <span className="text-yellow-500">
                        Message queued. Will send when online.
                    </span>
                </div>
            )}
        </div>
    );
}

export default MessageBubble;