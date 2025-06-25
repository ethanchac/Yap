import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

function MessageChat({ conversation, onNewMessage }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    
    // Enhanced method to get current user ID with better error handling
    const getCurrentUserId = () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const token = localStorage.getItem('token');
            
            // Try multiple possible user ID fields
            const userId = user._id || user.id || user.userId;
            
            console.log('Current user from localStorage:', user);
            console.log('Extracted user ID:', userId);
            
            if (!userId && token) {
                // If we have a token but no user ID, try to extract from token
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    console.log('Token payload:', payload);
                    return payload.userId || payload.id || payload._id;
                } catch (e) {
                    console.warn('Could not parse token:', e);
                }
            }
            
            return userId;
        } catch (error) {
            console.error('Error parsing user from localStorage:', error);
            return null;
        }
    };
    
    const currentUserId = getCurrentUserId();
    console.log('Current User ID:', currentUserId);

    useEffect(() => {
        if (!conversation || !conversation._id) {
            console.error('No conversation provided to MessageChat');
            setLoading(false);
            return;
        }

        // Initialize WebSocket connection
        const token = localStorage.getItem('token');
        const newSocket = io('http://localhost:5000', {
            auth: { token: token }
        });

        newSocket.on('connect', () => {
            console.log('Connected to messaging service');
            newSocket.emit('join_conversation', { conversation_id: conversation._id });
        });

        newSocket.on('new_message', (message) => {
            console.log('Received new message:', message);
            setMessages(prev => [...prev, message]);
            if (onNewMessage) {
                onNewMessage(conversation._id, message);
            }
        });

        newSocket.on('user_typing', (data) => {
            if (data.conversation_id === conversation._id && data.user_id !== currentUserId) {
                setOtherUserTyping(data.typing);
            }
        });

        newSocket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        setSocket(newSocket);
        fetchMessages();

        return () => {
            if (newSocket) {
                newSocket.emit('leave_conversation', { conversation_id: conversation._id });
                newSocket.disconnect();
            }
        };
    }, [conversation._id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/messages/conversations/${conversation._id}/messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Fetched messages:', data.messages);
                setMessages(data.messages || []);
            } else {
                console.error('Failed to fetch messages:', response.status);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        
        if (!newMessage.trim() || !socket) return;

        socket.emit('send_message', {
            conversation_id: conversation._id,
            content: newMessage.trim()
        });

        setNewMessage('');
        
        if (isTyping) {
            socket.emit('typing_stop', { conversation_id: conversation._id });
            setIsTyping(false);
        }
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);

        if (!socket) return;

        if (!isTyping) {
            socket.emit('typing_start', { conversation_id: conversation._id });
            setIsTyping(true);
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing_stop', { conversation_id: conversation._id });
            setIsTyping(false);
        }, 2000);
    };

    const formatMessageTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatMessageDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString();
        }
    };

    const shouldShowDateSeparator = (currentMessage, previousMessage) => {
        if (!previousMessage) return true;
        
        const currentDate = new Date(currentMessage.created_at).toDateString();
        const previousDate = new Date(previousMessage.created_at).toDateString();
        
        return currentDate !== previousDate;
    };

    // Enhanced function to check if message is from current user
    const isMyMessage = (message) => {
        if (!currentUserId) return false;
        
        // Check multiple possible sender ID fields
        const senderId = message.sender_id || message.sender?._id || message.sender?.id;
        const isOwn = senderId === currentUserId;
        
        console.log(`Message sender ID: ${senderId}, Current user: ${currentUserId}, Is my message: ${isOwn}`);
        return isOwn;
    };

    if (!conversation) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-400">No conversation selected</div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-400">Loading messages...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="bg-gray-700 border-b border-gray-600 p-4 flex items-center justify-between">
                <div className="flex items-center">
                    <img 
                        src={conversation.other_participant?.profile_picture || '/default-avatar.png'}
                        alt={conversation.other_participant?.username || 'Unknown User'}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="ml-3">
                        <h3 className="text-white font-semibold">{conversation.other_participant?.username || 'Unknown User'}</h3>
                        <p className="text-green-400 text-sm">Active now</p>
                    </div>
                </div>
                
                <div className="flex items-center space-x-4">
                    <button className="text-gray-400 hover:text-white transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                    </button>
                    <button className="text-gray-400 hover:text-white transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <polygon points="23 7 16 12 23 17 23 7" fill="currentColor"/>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                        </svg>
                    </button>
                    <button className="text-gray-400 hover:text-white transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="1" fill="currentColor"/>
                            <circle cx="19" cy="12" r="1" fill="currentColor"/>
                            <circle cx="5" cy="12" r="1" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Debug Info - Remove this in production */}
                <div className="text-xs text-gray-500 p-2 bg-gray-700 rounded">
                    Current User ID: {currentUserId || 'Not found'}
                </div>
                
                {messages.map((message, index) => {
                    const myMessage = isMyMessage(message);
                    
                    return (
                        <div key={message._id}>
                            {/* Date separator */}
                            {shouldShowDateSeparator(message, messages[index - 1]) && (
                                <div className="flex items-center justify-center my-4">
                                    <div className="bg-gray-600 text-gray-300 px-3 py-1 rounded-full text-xs">
                                        {formatMessageDate(message.created_at)}
                                    </div>
                                </div>
                            )}
                            
                            {/* Message Container */}
                            <div className={`flex items-end space-x-3 mb-4 ${
                                myMessage ? 'justify-end' : 'justify-start'
                            }`}>
                                {/* Profile Picture - Show on left for others, right for you */}
                                {!myMessage && (
                                    <img 
                                        src={message.sender?.profile_picture || '/default-avatar.png'}
                                        alt={message.sender?.username || 'Unknown'}
                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                    />
                                )}
                                
                                {/* Message Bubble */}
                                <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                                    myMessage ? 'order-1' : 'order-2'
                                }`}>
                                    {/* Username (only for other people's messages) */}
                                    {!myMessage && (
                                        <div className="text-gray-300 text-sm font-medium mb-1 ml-1">
                                            {message.sender?.username || 'Unknown'}
                                        </div>
                                    )}
                                    
                                    {/* Message Content with improved styling */}
                                    <div className={`rounded-2xl px-4 py-3 ${
                                        myMessage 
                                            ? 'bg-blue-500 text-white rounded-br-md shadow-lg' 
                                            : 'bg-gray-600 text-white rounded-bl-md shadow-md'
                                    }`}>
                                        <p className="break-words">{message.content}</p>
                                    </div>
                                    
                                    {/* Timestamp */}
                                    <div className={`text-xs text-gray-400 mt-1 px-1 ${
                                        myMessage ? 'text-right' : 'text-left'
                                    }`}>
                                        {formatMessageTime(message.created_at)}
                                    </div>
                                </div>

                                {/* Profile Picture for your messages */}
                                {myMessage && (
                                    <img 
                                        src={message.sender?.profile_picture || '/default-avatar.png'}
                                        alt="You"
                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0 order-2"
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {/* Typing indicator */}
                {otherUserTyping && (
                    <div className="flex items-start space-x-3">
                        <img 
                            src={conversation.other_participant?.profile_picture || '/default-avatar.png'}
                            alt="typing"
                            className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="bg-gray-600 rounded-lg px-4 py-2">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-600 p-4">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                    <button 
                        type="button"
                        className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-600"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M9 9h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M15 9h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>
                    
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={handleTyping}
                            placeholder={`Message ${conversation.other_participant?.username || 'user'}...`}
                            className="w-full bg-gray-600 text-white rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                        />
                        <button 
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                        </button>
                    </div>
                    
                    {newMessage.trim() && (
                        <button 
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-colors"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}

export default MessageChat;