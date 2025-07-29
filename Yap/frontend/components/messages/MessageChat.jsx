import { useState, useEffect, useCallback, useRef } from 'react';
import { messageService } from '../../services/messageService';
import { sortMessagesByTime } from './utils/easternTimeUtils';
import { useTheme } from '../../contexts/ThemeContext';
import { getCurrentUserIdentifier, getProfilePictureUrl, fetchUserInfo } from './utils/userUtils';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

function MessageChat({ conversation, onNewMessage }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [retryCount, setRetryCount] = useState(0);
    const [showOfflineMessage, setShowOfflineMessage] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const { isDarkMode } = useTheme();
    
    const currentUserIdentifier = getCurrentUserIdentifier();
    const messagesRef = useRef(new Map()); // Track processed messages to prevent duplicates
    const lastFetchTimeRef = useRef(0);
    const reconnectTimeoutRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const unsubscribeMessageRef = useRef(null);
    const unsubscribeTypingRef = useRef(null);

    // Connection status listener
    const handleConnectionStatusChange = useCallback((status) => {
        console.log('📡 Connection status changed:', status);
        setConnectionStatus(status);
        
        if (status === 'connected' && retryCount > 0) {
            console.log('✅ Reconnected successfully, refreshing messages');
            setRetryCount(0);
            setShowOfflineMessage(false);
            // Refresh messages after reconnection
            fetchMessages(true);
        } else if (status === 'disconnected') {
            setRetryCount(prev => prev + 1);
            setShowOfflineMessage(true);
        } else if (status === 'failed') {
            setShowOfflineMessage(true);
        }
    }, [retryCount]);

    // Enhanced message handler with deduplication
    const handleNewMessage = useCallback(async (newMessage) => {
        console.log('📨 Processing new message:', newMessage);
        
        // Check if we've already processed this message
        if (messagesRef.current.has(newMessage._id)) {
            console.log('🔄 Message already processed, skipping:', newMessage._id);
            return;
        }

        // Mark message as processed
        messagesRef.current.set(newMessage._id, true);
        
        console.log('📨 Current user identifier:', currentUserIdentifier);
        console.log('📨 Message sender_id:', newMessage.sender_id);
        console.log('📨 String comparison:', String(newMessage.sender_id) === String(currentUserIdentifier));
        
        // Handle messages from other users
        if (String(newMessage.sender_id) !== String(currentUserIdentifier)) {
            console.log('📨 Message from OTHER user - adding immediately');
            
            try {
                // Use sender info from message if available, otherwise fetch
                let senderInfo = newMessage.sender;
                if (!senderInfo || !senderInfo.username) {
                    senderInfo = await fetchUserInfo(newMessage.sender_id);
                }
                
                const messageWithSender = {
                    ...newMessage,
                    sender: senderInfo || {
                        _id: newMessage.sender_id,
                        username: 'Unknown',
                        profile_picture: ''
                    }
                };
                
                setMessages(prev => {
                    console.log('📨 Current messages count:', prev.length);
                    
                    // Double-check for duplicates by ID
                    const existsById = prev.some(msg => msg._id === messageWithSender._id);
                    if (existsById) {
                        console.log('📨 Message already exists by ID, skipping:', messageWithSender._id);
                        return prev;
                    }
                    
                    // Check for near-duplicate content (timing issues)
                    const existsByContent = prev.some(msg => 
                        msg.content === messageWithSender.content && 
                        msg.sender_id === messageWithSender.sender_id &&
                        Math.abs(new Date(msg.created_at) - new Date(messageWithSender.created_at)) < 5000
                    );
                    
                    if (existsByContent) {
                        console.log('📨 Similar message already exists, skipping to prevent duplicate');
                        return prev;
                    }
                    
                    console.log('📨 Adding new message from other user to UI');
                    const updated = [...prev, messageWithSender];
                    const sorted = sortMessagesByTime(updated);
                    console.log('📨 New messages count:', sorted.length);
                    return sorted;
                });
                
                // Notify parent component
                if (onNewMessage) {
                    console.log('📨 Notifying parent component of new message');
                    onNewMessage(conversation._id, messageWithSender);
                }
                
            } catch (error) {
                console.error('❌ Error processing message:', error);
                // Add message without sender info as fallback
                setMessages(prev => {
                    const existsById = prev.some(msg => msg._id === newMessage._id);
                    if (existsById) return prev;
                    
                    const messageWithoutSender = {
                        ...newMessage,
                        sender: {
                            _id: newMessage.sender_id,
                            username: 'Unknown',
                            profile_picture: ''
                        }
                    };
                    
                    const updated = [...prev, messageWithoutSender];
                    return sortMessagesByTime(updated);
                });
            }
        } else {
            console.log('📨 Message from CURRENT user - handling optimistic update');
            
            // For current user's messages, replace optimistic with real
            setMessages(prev => {
                // Look for optimistic message with same content
                const optimisticIndex = prev.findIndex(msg => 
                    msg.isOptimistic && 
                    msg.content === newMessage.content &&
                    String(msg.sender_id) === String(newMessage.sender_id)
                );
                
                if (optimisticIndex !== -1) {
                    console.log('📨 Replacing optimistic message with real message');
                    const updated = [...prev];
                    updated[optimisticIndex] = {
                        ...newMessage,
                        sender: prev[optimisticIndex].sender,
                        isOptimistic: false
                    };
                    return sortMessagesByTime(updated);
                } else {
                    // No optimistic message found, check if we already have this real message
                    const existsById = prev.some(msg => msg._id === newMessage._id);
                    if (existsById) {
                        console.log('📨 Real message already exists, skipping');
                        return prev;
                    }
                    
                    // Add the message (backup case)
                    console.log('📨 No optimistic message found, adding own message normally');
                    const messageWithSender = {
                        ...newMessage,
                        sender: newMessage.sender || {
                            _id: newMessage.sender_id,
                            username: 'You',
                            profile_picture: ''
                        }
                    };
                    
                    const updated = [...prev, messageWithSender];
                    return sortMessagesByTime(updated);
                }
            });
        }
    }, [conversation._id, currentUserIdentifier, onNewMessage]);

    // Typing indicator handler
    const handleTypingEvent = useCallback((typingData) => {
        console.log('⌨️ Typing event:', typingData);
        
        setTypingUsers(prev => {
            const userId = typingData.user_id;
            const isTyping = typingData.typing;
            
            if (isTyping) {
                // Add user to typing list if not already there
                if (!prev.find(user => user.user_id === userId)) {
                    return [...prev, {
                        user_id: userId,
                        username: typingData.username || 'Someone'
                    }];
                }
            } else {
                // Remove user from typing list
                return prev.filter(user => user.user_id !== userId);
            }
            
            return prev;
        });
    }, []);

    // Main effect for setting up WebSocket subscription
    useEffect(() => {
        if (!conversation || !conversation._id) {
            setLoading(false);
            return;
        }

        console.log('🔌 Setting up WebSocket subscription for conversation:', conversation._id);
        console.log('🔌 Current user identifier:', currentUserIdentifier);
        
        // Reset state when conversation changes
        setMessages([]);
        setLoading(true);
        setTypingUsers([]);
        messagesRef.current.clear();
        setShowOfflineMessage(false);
        
        // Ensure connection
        const initializeConnection = async () => {
            try {
                if (!messageService.isConnected()) {
                    console.log('🔌 Connecting to WebSocket...');
                    await messageService.connect();
                }
                
                // Set up connection status listener
                messageService.addConnectionListener(handleConnectionStatusChange);
                
                // Update connection status
                setConnectionStatus(messageService.getConnectionStatus());
                
                // Fetch initial messages
                await fetchMessages();

                // Subscribe to new messages
                console.log('📡 Creating WebSocket subscription for conversation:', conversation._id);
                unsubscribeMessageRef.current = messageService.subscribeToMessages(
                    conversation._id,
                    handleNewMessage
                );

                // Subscribe to typing indicators
                unsubscribeTypingRef.current = messageService.subscribeToTyping(
                    conversation._id,
                    handleTypingEvent
                );

                console.log('✅ WebSocket subscription created successfully for conversation:', conversation._id);
                
            } catch (error) {
                console.error('❌ Failed to initialize WebSocket connection:', error);
                setConnectionStatus('failed');
                setShowOfflineMessage(true);
            }
        };

        initializeConnection();

        return () => {
            console.log('🔌 Cleaning up WebSocket subscription for conversation:', conversation._id);
            
            // Remove connection status listener
            messageService.removeConnectionListener(handleConnectionStatusChange);
            
            // Clean up subscriptions
            if (unsubscribeMessageRef.current) {
                unsubscribeMessageRef.current();
                unsubscribeMessageRef.current = null;
            }
            
            if (unsubscribeTypingRef.current) {
                unsubscribeTypingRef.current();
                unsubscribeTypingRef.current = null;
            }
            
            // Clear timeout if exists
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [conversation._id, currentUserIdentifier, handleConnectionStatusChange, handleNewMessage, handleTypingEvent]);

    // Enhanced message fetching with retry logic
    const fetchMessages = async (isRefresh = false) => {
        try {
            console.log('📨 Fetching messages from API for conversation:', conversation._id);
            
            // Prevent too frequent fetches
            const now = Date.now();
            if (!isRefresh && now - lastFetchTimeRef.current < 1000) {
                console.log('📨 Skipping fetch - too recent');
                return;
            }
            lastFetchTimeRef.current = now;
            
            // Get messages from API
            const messages = await messageService.getMessages(conversation._id);
            console.log('📨 Raw messages from API:', messages.length, 'messages');
            
            // Clear the processed messages ref when fetching fresh
            if (isRefresh) {
                messagesRef.current.clear();
            }
            
            // Populate sender info for each message
            const messagesWithSenders = await Promise.all(
                messages.map(async (message) => {
                    // Mark as processed
                    messagesRef.current.set(message._id, true);
                    
                    // Use existing sender info or fetch if missing
                    let senderInfo = message.sender;
                    if (!senderInfo || !senderInfo.username) {
                        senderInfo = await fetchUserInfo(message.sender_id);
                    }
                    
                    return {
                        ...message,
                        sender: senderInfo || {
                            _id: message.sender_id,
                            username: String(message.sender_id) === String(currentUserIdentifier) ? 'You' : 'Unknown',
                            profile_picture: ''
                        }
                    };
                })
            );
            
            const sortedMessages = sortMessagesByTime(messagesWithSenders);
            setMessages(sortedMessages);
            console.log('✅ Loaded and sorted', sortedMessages.length, 'messages');
            
        } catch (error) {
            console.error('❌ Error fetching messages:', error);
            setRetryCount(prev => prev + 1);
            
            // Retry after delay if not too many attempts
            if (retryCount < 3) {
                console.log(`🔄 Retrying message fetch in ${(retryCount + 1) * 2000}ms`);
                reconnectTimeoutRef.current = setTimeout(() => {
                    fetchMessages(isRefresh);
                }, (retryCount + 1) * 2000);
            }
        } finally {
            setLoading(false);
        }
    };

    // Enhanced message sending with WebSocket
    const handleSendMessage = async (messageContent) => {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        console.log('📤 Preparing to send message:', messageContent);
        console.log('📤 Temp ID for optimistic update:', tempId);
        console.log('📤 Current user identifier:', currentUserIdentifier);

        setSending(true);

        // Stop typing indicator
        messageService.stopTyping(conversation._id);

        try {
            // Get current user info for optimistic message
            const currentUserInfo = await fetchUserInfo(currentUserIdentifier);
            console.log('📤 Current user info for optimistic message:', currentUserInfo);
            
            // Optimistically add message to UI immediately
            const tempMessage = {
                _id: tempId,
                conversation_id: conversation._id,
                sender_id: currentUserIdentifier,
                content: messageContent,
                created_at: new Date().toISOString(),
                sender: currentUserInfo || {
                    _id: currentUserIdentifier,
                    username: 'You',
                    profile_picture: ''
                },
                isOptimistic: true
            };

            console.log('📤 Adding optimistic message to UI:', tempMessage);

            // Add optimistic message
            setMessages(prev => {
                const updated = [...prev, tempMessage];
                return sortMessagesByTime(updated);
            });

            // Send the actual message via WebSocket
            console.log('📤 Sending message via WebSocket...');
            const sentMessage = await messageService.sendMessage(
                conversation._id,
                currentUserIdentifier,
                messageContent
            );
            
            console.log('✅ Message sent successfully via WebSocket:', sentMessage);

            // The WebSocket subscription should handle updating the optimistic message
            // But we'll add a fallback timeout in case subscription is slow
            setTimeout(() => {
                console.log('🕐 Fallback: Checking if optimistic message was replaced...');
                setMessages(prev => {
                    const stillHasOptimistic = prev.some(msg => msg._id === tempId && msg.isOptimistic);
                    if (stillHasOptimistic) {
                        console.log('⚠️ Optimistic message still present, replacing manually');
                        const realMessage = {
                            ...sentMessage,
                            sender: currentUserInfo || {
                                _id: currentUserIdentifier,
                                username: 'You',
                                profile_picture: ''
                            },
                            isOptimistic: false
                        };
                        
                        const withoutOptimistic = prev.filter(msg => msg._id !== tempId);
                        const updated = [...withoutOptimistic, realMessage];
                        return sortMessagesByTime(updated);
                    }
                    return prev;
                });
            }, 5000); // 5 second fallback

            // Also notify parent component
            if (onNewMessage) {
                const realMessage = {
                    ...sentMessage,
                    sender: currentUserInfo || {
                        _id: currentUserIdentifier,
                        username: 'You',
                        profile_picture: ''
                    }
                };
                onNewMessage(conversation._id, realMessage);
            }
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            
            // Remove optimistic message on error
            setMessages(prev => prev.filter(msg => msg._id !== tempId));
            
            // Show error to user based on connection status
            if (connectionStatus === 'disconnected') {
                alert('You are offline. Please check your connection and try again.');
            } else {
                alert('Failed to send message. Please try again.');
            }
            
            // Return the message content so it can be restored in the input
            return messageContent;
        } finally {
            setSending(false);
        }
    };

    // Handle typing indicators
    const handleTypingStart = () => {
        if (messageService.isConnected()) {
            messageService.startTyping(conversation._id);
        }
    };

    const handleTypingStop = () => {
        if (messageService.isConnected()) {
            messageService.stopTyping(conversation._id);
        }
    };

    // Manual retry function
    const handleRetry = async () => {
        console.log('🔄 Manual retry triggered');
        setRetryCount(0);
        setShowOfflineMessage(false);
        
        try {
            await messageService.reconnect();
            await fetchMessages(true);
        } catch (error) {
            console.error('❌ Manual retry failed:', error);
            setShowOfflineMessage(true);
        }
    };

    if (!conversation) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No conversation selected</div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading messages...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Connection Status Banner */}
            {showOfflineMessage && (
                <div className="bg-yellow-600 text-white px-4 py-2 text-sm flex items-center justify-between">
                    <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        {connectionStatus === 'disconnected' ? 'Connection lost. Messages may not sync in real-time.' : 'Connection failed. Unable to send/receive messages.'}
                    </div>
                    <button 
                        onClick={handleRetry}
                        className="bg-yellow-700 hover:bg-yellow-800 px-3 py-1 rounded text-xs font-medium transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}


            <ChatHeader 
                conversation={conversation} 
                getProfilePictureUrl={getProfilePictureUrl} 
                connectionStatus={connectionStatus}
                typingUsers={typingUsers}
            />
            
            <MessageList 
                messages={messages} 
                currentUserIdentifier={currentUserIdentifier}
                getProfilePictureUrl={getProfilePictureUrl}
                typingUsers={typingUsers}
            />
            
            <MessageInput 
                conversation={conversation}
                onSendMessage={handleSendMessage}
                sending={sending}
                disabled={connectionStatus === 'failed'}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
            />
            
        </div>
    );
}

export default MessageChat;