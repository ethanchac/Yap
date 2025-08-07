import React, { useEffect, useRef, forwardRef } from 'react';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeperator';
import TypingIndicator from './TypingIndicator';
import { shouldShowDateSeparator } from './utils/easternTimeUtils';
import { API_BASE_URL } from '../../services/config';

const MessageList = forwardRef(({ 
    messages, 
    currentUserIdentifier, 
    getProfilePictureUrl,
    typingUsers = [],
    onScroll,
    loadingOlderMessages,
    hasMoreMessages 
}, ref) => {
    const messagesEndRef = useRef(null);
    const isInitialLoadRef = useRef(true);
    const userScrolledRef = useRef(false);

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
    }, [messages, ref]);

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
    }, [typingUsers, ref]);

    // Enhanced scroll handler
    const handleScroll = (e) => {
        userScrolledRef.current = true;
        if (onScroll) {
            onScroll(e);
        }
    };

    const isMyMessage = (message) => {
        if (!currentUserIdentifier) return false;
        const senderVariations = [
            message.sender_id,
            message.senderId,
            message.sender?._id,
            message.sender?.id,
            message.sender?.userId,
            message.sender?.user_id,
            message.sender?.username,
            message.user_id,
            message.userId,
            message.username,
            message.from,
            message.author_id,
            message.authorId,
            message.author?.username
        ].filter(Boolean);
        
        for (const senderIdentifier of senderVariations) {
            if (String(senderIdentifier) === String(currentUserIdentifier)) return true;
        }
        return false;
    };

    // Group consecutive messages from same sender
    const groupMessages = (messages) => {
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

        return grouped;
    };

    const messageGroups = groupMessages(messages);

    if (messages.length === 0 && typingUsers.length === 0 && !loadingOlderMessages) {
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

            {messageGroups.map((group, groupIndex) => {
                const showDateSeparator = groupIndex === 0 || 
                    shouldShowDateSeparator(
                        group.messages[0], 
                        messageGroups[groupIndex - 1]?.messages[messageGroups[groupIndex - 1].messages.length - 1]
                    );

                return (
                    <div key={`group-${groupIndex}`}>
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
                                                e.target.src = `${API_BASE_URL}/static/default/default-avatar.png`;
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
                                    e.target.src = `${API_BASE_URL}/static/default/default-avatar.png`;
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

MessageList.displayName = 'MessageList';

export default MessageList;