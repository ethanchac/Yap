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
    const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const { isDarkMode } = useTheme();
    
    const currentUserIdentifier = getCurrentUserIdentifier();
    const messagesRef = useRef(new Map()); // Track processed messages to prevent duplicates
    const lastFetchTimeRef = useRef(0);
    const reconnectTimeoutRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const unsubscribeMessageRef = useRef(null);
    const unsubscribeTypingRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const shouldScrollToBottomRef = useRef(true);
    const isUserScrollingRef = useRef(false);
    const lastScrollTopRef = useRef(0);
    const debounceTimeoutRef = useRef(null);
    const messagesPerPage = 50;

    // Smart scrolling utilities
    const scrollToBottom = useCallback(() => {
        if (scrollContainerRef.current && shouldScrollToBottomRef.current) {
            const container = scrollContainerRef.current;
            container.scrollTop = container.scrollHeight;
            console.log('📜 Scrolled to bottom');
        }
    }, []);

    const preserveScrollPosition = useCallback(() => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const scrollHeight = container.scrollHeight;
            const scrollTop = container.scrollTop;
            const clientHeight = container.clientHeight;
            
            // User is near bottom (within 100px) - should auto-scroll for new messages
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
            shouldScrollToBottomRef.current = isNearBottom;
            
            console.log('📜 Scroll position preserved:', { 
                scrollTop, 
                scrollHeight, 
                clientHeight, 
                isNearBottom,
                shouldAutoScroll: shouldScrollToBottomRef.current 
            });
            
            return { scrollTop, scrollHeight, isNearBottom };
        }
        return null;
    }, []);

    // Debounced scroll handler for loading older messages
    const handleScroll = useCallback(() => {
        if (!scrollContainerRef.current || loadingOlderMessages || !hasMoreMessages) return;
        
        const container = scrollContainerRef.current;
        const scrollTop = container.scrollTop;
        
        // Detect if user is actively scrolling
        isUserScrollingRef.current = Math.abs(scrollTop - lastScrollTopRef.current) > 5;
        lastScrollTopRef.current = scrollTop;
        
        // Update shouldScrollToBottom based on current position
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        shouldScrollToBottomRef.current = isNearBottom;
        
        // Check if we should load older messages (near top)
        if (scrollTop < 300) {
            // Clear existing debounce
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
            
            // Debounce the load older messages call
            debounceTimeoutRef.current = setTimeout(() => {
                console.log('📜 Loading older messages - user scrolled near top');
                loadOlderMessages();
            }, 300);
        }
    }, [loadingOlderMessages, hasMoreMessages]);

    // Load older messages with pagination
    const loadOlderMessages = useCallback(async () => {
        if (loadingOlderMessages || !hasMoreMessages) return;
        
        setLoadingOlderMessages(true);
        console.log('📨 Loading older messages, page:', currentPage + 1);
        
        try {
            // Get older messages from API with pagination
            const olderMessages = await messageService.getMessages(
                conversation._id, 
                { page: currentPage + 1, limit: messagesPerPage }
            );
            
            if (olderMessages.length === 0) {
                setHasMoreMessages(false);
                console.log('📨 No more older messages available');
                return;
            }
            
            // Preserve scroll position before adding messages
            const scrollPos = preserveScrollPosition();
            const prevScrollHeight = scrollPos?.scrollHeight || 0;
            
            // Process older messages
            const messagesWithSenders = await Promise.all(
                olderMessages.map(async (message) => {
                    messagesRef.current.set(message._id, true);
                    
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
            
            // Add older messages to the beginning
            setMessages(prev => {
                const combined = [...messagesWithSenders, ...prev];
                const sorted = sortMessagesByTime(combined);
                console.log('📨 Added', olderMessages.length, 'older messages');
                return sorted;
            });
            
            setCurrentPage(prev => prev + 1);
            
            // Restore scroll position after messages are added
            setTimeout(() => {
                if (scrollContainerRef.current && scrollPos) {
                    const container = scrollContainerRef.current;
                    const newScrollHeight = container.scrollHeight;
                    const heightDifference = newScrollHeight - prevScrollHeight;
                    container.scrollTop = (scrollPos.scrollTop || 0) + heightDifference;
                    console.log('📜 Restored scroll position after loading older messages');
                }
            }, 100);
            
        } catch (error) {
            console.error('❌ Error loading older messages:', error);
        } finally {
            setLoadingOlderMessages(false);
        }
    }, [conversation._id, currentPage, loadingOlderMessages, hasMoreMessages, currentUserIdentifier, preserveScrollPosition, messagesPerPage]);
    // Helper function to add message without full re-sort
    const addMessageOptimized = useCallback((prevMessages, newMessage, isNewIncoming = false) => {
        // Check if message already exists
        const existsById = prevMessages.some(msg => msg._id === newMessage._id);
        if (existsById) {
            return prevMessages;
        }

        // Check for near-duplicate content (timing issues)
        const existsByContent = prevMessages.some(msg => 
            msg.content === newMessage.content && 
            msg.sender_id === newMessage.sender_id &&
            Math.abs(new Date(msg.created_at) - new Date(newMessage.created_at)) < 5000
        );
        
        if (existsByContent) {
            return prevMessages;
        }

        // For most cases, new messages are newer, so append to end
        const newMessageTime = new Date(newMessage.created_at).getTime();
        
        // If the list is empty or the new message is newer than the last message, just append
        if (prevMessages.length === 0 || 
            newMessageTime >= new Date(prevMessages[prevMessages.length - 1].created_at).getTime()) {
            
            // If this is a new incoming message and user is near bottom, enable auto-scroll
            if (isNewIncoming && shouldScrollToBottomRef.current) {
                setTimeout(scrollToBottom, 100);
            }
            
            return [...prevMessages, newMessage];
        }

        // Only do a full sort if the message is out of order (rare case)
        const updated = [...prevMessages, newMessage];
        const sorted = sortMessagesByTime(updated);
        
        if (isNewIncoming && shouldScrollToBottomRef.current) {
            setTimeout(scrollToBottom, 100);
        }
        
        return sorted;
    }, [scrollToBottom]);

    // Connection status listener
    const handleConnectionStatusChange = useCallback((status) => {
        console.log('📡 Connection status changed:', status);
        setConnectionStatus(status);
        
        if (status === 'connected' && retryCount > 0) {
            console.log('✅ Reconnected successfully, syncing quietly');
            setRetryCount(0);
            setShowOfflineMessage(false);
            // Don't show loading screen on reconnection - just sync quietly
            fetchMessagesQuietly();
        } else if (status === 'disconnected') {
            setRetryCount(prev => prev + 1);
            setShowOfflineMessage(true);
            // Don't show loading screen on disconnection
        } else if (status === 'failed') {
            setShowOfflineMessage(true);
            // Don't show loading screen on failure
        }
    }, [retryCount]);

    // Enhanced message handler with optimized updates
    const handleNewMessage = useCallback(async (newMessage) => {
        console.log('📨 Processing new message:', newMessage);
        
        // Check if we've already processed this message
        if (messagesRef.current.has(newMessage._id)) {
            console.log('🔄 Message already processed, skipping:', newMessage._id);
            return;
        }

        // Mark message as processed immediately to prevent race conditions
        messagesRef.current.set(newMessage._id, true);
        
        console.log('📨 Current user identifier:', currentUserIdentifier);
        console.log('📨 Message sender_id:', newMessage.sender_id);
        console.log('📨 Message sender (object):', newMessage.sender);
        console.log('📨 String comparison:', String(newMessage.sender_id) === String(currentUserIdentifier));
        
        // CRITICAL FIX: Normalize sender info BEFORE any other processing
        const isFromCurrentUser = String(newMessage.sender_id) === String(currentUserIdentifier);
        
        if (isFromCurrentUser) {
            console.log('🔧 FIXING: Normalizing current user sender info');
            console.log('🔧 Before fix:', newMessage.sender);
            // FORCE correct sender information for our own messages
            newMessage.sender = {
                _id: currentUserIdentifier,
                username: 'You',
                profile_picture: newMessage.sender?.profile_picture || ''
            };
            console.log('🔧 After fix:', newMessage.sender);
        }
        
        if (!isFromCurrentUser) {
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
                    console.log('📨 Adding new message from other user to UI');
                    return addMessageOptimized(prev, messageWithSender, true); // true = isNewIncoming
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
                    const messageWithoutSender = {
                        ...newMessage,
                        sender: {
                            _id: newMessage.sender_id,
                            username: 'Unknown',
                            profile_picture: ''
                        }
                    };
                    
                    return addMessageOptimized(prev, messageWithoutSender);
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
                    console.log('📨 Server sender info:', newMessage.sender);
                    console.log('📨 Current user ID:', currentUserIdentifier);
                    
                    const updated = [...prev];
                    
                    // CRITICAL FIX: Always use current user info for our own messages
                    // Don't trust server sender info for our own messages
                    updated[optimisticIndex] = {
                        ...newMessage,
                        sender: {
                            _id: currentUserIdentifier,
                            username: 'You',
                            profile_picture: newMessage.sender?.profile_picture || ''
                        },
                        isOptimistic: false
                    };
                    
                    console.log('📨 Final message sender:', updated[optimisticIndex].sender);
                    // No need to re-sort since we're just replacing in place
                    return updated;
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
                        sender: {
                            _id: currentUserIdentifier,
                            username: 'You',
                            profile_picture: newMessage.sender?.profile_picture || ''
                        }
                    };
                    
                    return addMessageOptimized(prev, messageWithSender);
                }
            });
        }
    }, [conversation._id, currentUserIdentifier, onNewMessage, addMessageOptimized]);

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
        
        // Reset state when conversation changes (but prevent flicker)
        setMessages([]);
        setLoading(true);
        setTypingUsers([]);
        setCurrentPage(1);
        setHasMoreMessages(true);
        setLoadingOlderMessages(false);
        messagesRef.current.clear();
        setShowOfflineMessage(false);
        shouldScrollToBottomRef.current = true; // Reset scroll behavior for new conversation
        
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
                setLoading(false); // Ensure loading stops on error
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
            
            // Scroll to bottom only on initial load
            if (sortedMessages.length > 0) {
                setTimeout(scrollToBottom, 100);
            }
            
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

    // Quiet message sync without loading screen
    const fetchMessagesQuietly = async () => {
        try {
            console.log('🔄 Quietly syncing messages for conversation:', conversation._id);
            
            const messages = await messageService.getMessages(conversation._id);
            console.log('🔄 Received', messages.length, 'messages for quiet sync');
            
            // Only update if we have new messages or significant differences
            if (messages.length === 0) return;
            
            // Populate sender info for each message
            const messagesWithSenders = await Promise.all(
                messages.map(async (message) => {
                    // Mark as processed
                    messagesRef.current.set(message._id, true);
                    
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
            
            // Only update if there are actual differences
            setMessages(prev => {
                if (prev.length === sortedMessages.length) {
                    // Same length, check if content is different
                    const isDifferent = prev.some((msg, index) => 
                        !sortedMessages[index] || msg._id !== sortedMessages[index]._id
                    );
                    if (!isDifferent) {
                        console.log('🔄 No changes detected, keeping current messages');
                        return prev;
                    }
                }
                
                console.log('🔄 Updating messages quietly');
                return sortedMessages;
            });
            
        } catch (error) {
            console.error('❌ Error in quiet message sync:', error);
            // Don't show error to user for quiet sync
        }
    };

    // Enhanced message sending with optimized UI updates
    const handleSendMessage = async (messageContent, attachedImage = null) => {
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        console.log('📤 Preparing to send message:', messageContent);
        console.log('📤 Temp ID for optimistic update:', tempId);
        console.log('📤 Current user identifier:', currentUserIdentifier);

        setSending(true);

        // Stop typing indicator
        messageService.stopTyping(conversation._id);

        try {
            // Get current user info for optimistic message (fetch in parallel)
            const currentUserInfoPromise = fetchUserInfo(currentUserIdentifier);
            
            // Create optimistic message immediately to prevent "No messages yet" flicker
            const tempMessage = {
                _id: tempId,
                conversation_id: conversation._id,
                sender_id: currentUserIdentifier,
                content: messageContent,
                created_at: new Date().toISOString(),
                message_type: attachedImage ? 'image' : 'text',
                attachment_url: attachedImage?.url || null,
                attachment_s3_key: attachedImage?.s3_key || null,
                sender: {
                    _id: currentUserIdentifier,
                    username: 'You',
                    profile_picture: ''
                },
                isOptimistic: true
            };

            console.log('📤 Adding optimistic message to UI:', tempMessage);

            // Add optimistic message IMMEDIATELY to prevent any flicker
            setMessages(prev => addMessageOptimized(prev, tempMessage, true)); // true = trigger scroll
            
            // Now get user info for better display (non-blocking)
            const currentUserInfo = await currentUserInfoPromise;
            console.log('📤 Current user info for optimistic message:', currentUserInfo);
            
            // Update the optimistic message with better user info if available
            if (currentUserInfo) {
                setMessages(prev => prev.map(msg => 
                    msg._id === tempId ? { ...msg, sender: currentUserInfo } : msg
                ));
            }

            // Send the actual message via WebSocket
            console.log('📤 Sending message via WebSocket...');
            const sentMessage = await messageService.sendMessage(
                conversation._id,
                currentUserIdentifier,
                messageContent,
                attachedImage
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
                        
                        // Replace optimistic message in place to avoid re-render
                        const optimisticIndex = prev.findIndex(msg => msg._id === tempId);
                        if (optimisticIndex !== -1) {
                            const updated = [...prev];
                            updated[optimisticIndex] = realMessage;
                            return updated;
                        }
                        
                        return addMessageOptimized(prev.filter(msg => msg._id !== tempId), realMessage);
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
            // Use quiet sync instead of full refresh - no loading screen
            await fetchMessagesQuietly();
        } catch (error) {
            console.error('❌ Manual retry failed:', error);
            setShowOfflineMessage(true);
            // Don't show loading screen on retry failure
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
                ref={scrollContainerRef}
                messages={messages} 
                currentUserIdentifier={currentUserIdentifier}
                getProfilePictureUrl={getProfilePictureUrl}
                typingUsers={typingUsers}
                onScroll={handleScroll}
                loadingOlderMessages={loadingOlderMessages}
                hasMoreMessages={hasMoreMessages}
                sending={sending}
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