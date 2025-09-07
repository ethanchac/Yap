import React, { useEffect, useRef, forwardRef, useMemo, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeperator';
import TypingIndicator from './TypingIndicator';
import { shouldShowDateSeparator } from './utils/easternTimeUtils';
import { getDefaultProfilePicture } from '../../utils/profileUtils';

const MessageList = forwardRef(({ 
    messages, 
    currentUserIdentifier, 
    getProfilePictureUrl,
    typingUsers = [],
    onScroll,
    loadingOlderMessages,
    hasMoreMessages,
    sending = false
}, ref) => {
    const messagesEndRef = useRef(null);
    const isInitialLoadRef = useRef(true);
    const userScrolledRef = useRef(false);

    // FIXED: Simplified isMyMessage function to prevent sender mix-up
    const isMyMessage = useCallback((message) => {
        if (!currentUserIdentifier || !message) return false;
        
        // The primary identifier should be sender_id which matches currentUserIdentifier
        const messageSenderId = message.sender_id;
        const isMyMsg = String(messageSenderId) === String(currentUserIdentifier);
        
        // Debug: Log sender identification for debugging account switching issues
        if (message.content) {
            console.log('🔍 Message sender check:', {
                messageId: message._id?.slice(-6),
                content: message.content.slice(0, 20) + '...',
                messageSenderId,
                currentUserIdentifier,
                isMyMessage: isMyMsg
            });
        }
        
        return isMyMsg;
    }, [currentUserIdentifier]);

    // FIXED: Memoize message groups to prevent unnecessary recalculation
    const messageGroups = useMemo(() => {
        console.log('🔄 Recalculating message groups for', messages.length, 'messages');
        
        const grouped = [];
        let currentGroup = null;

        messages.forEach((message, index) => {
            const isMyMsg = isMyMessage(message);
            const prevMessage = messages[index - 1];
            const prevIsMyMsg = prevMessage ? isMyMessage(prevMessage) : null;
            
            // Check if we should start a new group
            const shouldStartNewGroup = !currentGroup || 
                isMyMsg !== prevIsMyMsg ||
                message.sender_id !== prevMessage?.sender_id ||
                shouldShowDateSeparator(message, prevMessage) ||
                (prevMessage && new Date(message.created_at) - new Date(prevMessage.created_at) > 300000); // 5 minutes
            
            if (shouldStartNewGroup) {
                if (currentGroup) {
                    grouped.push(currentGroup);
                }
                currentGroup = {
                    id: `group-${message._id}-${message.sender_id}`, // Stable ID for React keys
                    sender_id: message.sender_id,
                    sender: message.sender,
                    isMyMessage: isMyMsg,
                    messages: [message],
                    firstMessageTime: message.created_at
                };
            } else {
                currentGroup.messages.push(message);
            }
        });

        if (currentGroup) {
            grouped.push(currentGroup);
        }

        console.log('✅ Message groups calculated:', grouped.length, 'groups');
        return grouped;
    }, [messages, isMyMessage]); // Only recalculate when messages or isMyMessage changes

    // Smart scroll behavior - only auto-scroll when appropriate
    useEffect(() => {
        // On initial load, always scroll to bottom
        if (isInitialLoadRef.current && messages.length > 0) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                isInitialLoadRef.current = false;
            }, 100);
            return;
        }

        // For new messages, only scroll if user is near bottom
        if (!isInitialLoadRef.current && messages.length > 0) {
            const container = ref?.current;
            if (container) {
                const { scrollTop, scrollHeight, clientHeight } = container;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
                
                // Auto-scroll for new messages only if user is near bottom
                if (isNearBottom && !userScrolledRef.current) {
                    setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }
            }
        }

        // Reset user scrolled flag after a delay
        if (userScrolledRef.current) {
            const timer = setTimeout(() => {
                userScrolledRef.current = false;
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [messages.length, ref]); // Only depend on message count, not the full messages array

    // Handle typing indicators - only scroll if near bottom
    useEffect(() => {
        if (typingUsers.length > 0 && !isInitialLoadRef.current) {
            const container = ref?.current;
            if (container) {
                const { scrollTop, scrollHeight, clientHeight } = container;
                const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
                
                if (isNearBottom) {
                    setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }
            }
        }
    }, [typingUsers.length, ref]); // Only depend on typing users count

    // Enhanced scroll handler
    const handleScroll = useCallback((e) => {
        userScrolledRef.current = true;
        if (onScroll) {
            onScroll(e);
        }
    }, [onScroll]);

    if (messages.length === 0 && typingUsers.length === 0 && !loadingOlderMessages && !sending) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="mb-4">
                        <svg 
                            width="64" 
                            height="64" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="mx-auto text-gray-400"
                        >
                            <path 
                                d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <p className="text-gray-500 mb-2">No messages yet</p>
                    <p className="text-gray-400 text-sm">Send a message to start the conversation</p>
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={ref}
            className="flex-1 overflow-y-auto p-4 space-y-3"
            onScroll={handleScroll}
        >
            {/* Loading indicator for older messages */}
            {loadingOlderMessages && (
                <div className="flex justify-center py-4">
                    <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                        <span className="text-sm text-gray-500">Loading older messages...</span>
                    </div>
                </div>
            )}
            
            {/* End of messages indicator */}
            {!hasMoreMessages && messages.length > 0 && (
                <div className="flex justify-center py-4">
                    <div className="text-xs text-gray-400 flex items-center space-x-2">
                        <div className="h-px bg-gray-300 flex-1"></div>
                        <span className="px-3">Beginning of conversation</span>
                        <div className="h-px bg-gray-300 flex-1"></div>
                    </div>
                </div>
            )}

            {/* FIXED: Use stable keys and memoized groups */}
            {messageGroups.map((group, groupIndex) => {
                const showDateSeparator = groupIndex === 0 || 
                    shouldShowDateSeparator(
                        group.messages[0], 
                        messageGroups[groupIndex - 1]?.messages[messageGroups[groupIndex - 1].messages.length - 1]
                    );

                return (
                    <MessageGroup
                        key={group.id} // Use stable ID instead of index
                        group={group}
                        showDateSeparator={showDateSeparator}
                        getProfilePictureUrl={getProfilePictureUrl}
                    />
                );
            })}
            
            {/* Typing indicator */}
            {typingUsers.length > 0 && (
                <div className="flex justify-start mb-4">
                    <div className="flex items-end max-w-[85%] sm:max-w-[75%] md:max-w-[70%]">
                        {/* Avatar for typing user */}
                        <div className="flex-shrink-0 mr-2 mb-1">
                            <img 
                                src={getProfilePictureUrl(typingUsers[0]?.profile_picture)}
                                alt={typingUsers[0]?.username || 'Someone'}
                                className="w-8 h-8 rounded-full object-cover"
                                onError={(e) => {
                                    e.target.src = getDefaultProfilePicture();
                                }}
                            />
                        </div>
                        
                        <TypingIndicator typingUsers={typingUsers} />
                    </div>
                </div>
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
        </div>
    );
});

// FIXED: Separate memoized component for message groups to prevent unnecessary re-renders
const MessageGroup = React.memo(({ group, showDateSeparator, getProfilePictureUrl }) => {
    return (
        <div>
            {/* Date separator */}
            {showDateSeparator && (
                <DateSeparator createdAt={group.firstMessageTime} />
            )}
            
            {/* Message group */}
            <div className={`flex ${group.isMyMessage ? 'justify-end' : 'justify-start'} mb-3`}>
                <div className={`flex ${group.isMyMessage ? 'flex-row-reverse items-end' : 'flex-row items-end'} max-w-[85%] sm:max-w-[75%] md:max-w-[70%]`}>
                    {/* Avatar (only show for other users) */}
                    {!group.isMyMessage && (
                        <div className="flex-shrink-0 mr-2 mb-1">
                            <img 
                                src={getProfilePictureUrl(group.sender?.profile_picture)}
                                alt={group.sender?.username || 'Unknown User'}
                                className="w-8 h-8 rounded-full object-cover"
                                onError={(e) => {
                                    e.target.src = getDefaultProfilePicture();
                                }}
                            />
                        </div>
                    )}
                    
                    {/* Messages in group */}
                    <div className={`flex flex-col space-y-1 ${group.isMyMessage ? 'items-end' : 'items-start'}`}>
                        {/* Sender name (only for other users and first message of group) */}
                        {!group.isMyMessage && (
                            <span className="text-xs text-gray-500 ml-3 mb-1 font-medium">
                                {group.sender?.username || 'Unknown User'}
                            </span>
                        )}
                        
                        {/* Individual messages */}
                        {group.messages.map((message, messageIndex) => (
                            <MessageBubble 
                                key={message._id}
                                message={message}
                                isMyMessage={group.isMyMessage}
                                isFirstInGroup={messageIndex === 0}
                                isLastInGroup={messageIndex === group.messages.length - 1}
                                showAvatar={false} // We handle avatar at group level
                                showSender={false} // We handle sender name at group level
                                getProfilePictureUrl={getProfilePictureUrl}
                            />
                        ))}
                    </div>
                    
                    {/* Spacer for my messages to maintain consistent layout */}
                    {group.isMyMessage && (
                        <div className="w-10 flex-shrink-0"></div>
                    )}
                </div>
            </div>
        </div>
    );
});

MessageGroup.displayName = 'MessageGroup';
MessageList.displayName = 'MessageList';

export default MessageList;