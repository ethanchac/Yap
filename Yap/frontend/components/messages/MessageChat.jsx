import { useState, useEffect, useRef } from 'react';
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
    
    const currentUserId = JSON.parse(localStorage.getItem('user'))?._id;

    useEffect(() => {
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
            setMessages(prev => [...prev, message]);
            onNewMessage(conversation._id, message);
        });

        newSocket.on('user_typing', (data) => {
            if (data.conversation_id === conversation._id && data.user_id !== currentUserId) {
                setOtherUserTyping(data.typing);
            }
        });

        setSocket(newSocket);

        // Fetch message history
        fetchMessages();

        return () => {
            newSocket.emit('leave_conversation', { conversation_id: conversation._id });
            newSocket.disconnect();
        };
    }, [conversation._id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/messages/conversations/${conversation._id}/messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages);
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
        
        // Stop typing indicator
        if (isTyping) {
            socket.emit('typing_stop', { conversation_id: conversation._id });
            setIsTyping(false);
        }
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);

        if (!socket) return;

        // Start typing indicator
        if (!isTyping) {
            socket.emit('typing_start', { conversation_id: conversation._id });
            setIsTyping(true);
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 2 seconds of inactivity
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

    if (loading) {
        return (
            <div>
                <div>Loading messages...</div>
            </div>
        );
    }

    return (
        <div>
            {/* Chat Header */}
            <div>
                <div>
                    <img 
                        src={conversation.other_participant?.profile_picture || '/default-avatar.png'}
                        alt={conversation.other_participant?.username}
                        width="40"
                        height="40"
                    />
                    <div>
                        <h3>{conversation.other_participant?.username || 'Unknown User'}</h3>
                        <p>Active now</p>
                    </div>
                </div>
                
                <div>
                    <button>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                    </button>
                    <button>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <polygon points="23 7 16 12 23 17 23 7"/>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                        </svg>
                    </button>
                    <button>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="1"/>
                            <circle cx="19" cy="12" r="1"/>
                            <circle cx="5" cy="12" r="1"/>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div>
                {messages.map((message, index) => (
                    <div key={message._id}>
                        {/* Date separator */}
                        {shouldShowDateSeparator(message, messages[index - 1]) && (
                            <div>
                                <span>{formatMessageDate(message.created_at)}</span>
                            </div>
                        )}
                        
                        {/* Message */}
                        <div data-sender={message.sender_id === currentUserId ? 'me' : 'other'}>
                            {message.sender_id !== currentUserId && (
                                <img 
                                    src={message.sender?.profile_picture || '/default-avatar.png'}
                                    alt={message.sender?.username}
                                    width="28"
                                    height="28"
                                />
                            )}
                            
                            <div>
                                <p>{message.content}</p>
                                <small>{formatMessageTime(message.created_at)}</small>
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* Typing indicator */}
                {otherUserTyping && (
                    <div>
                        <img 
                            src={conversation.other_participant?.profile_picture || '/default-avatar.png'}
                            alt="typing"
                            width="28"
                            height="28"
                        />
                        <div>
                            <span>typing...</span>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div>
                <form onSubmit={handleSendMessage}>
                    <div>
                        <button type="button">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                                <path d="M9 9h.01"/>
                                <path d="M15 9h.01"/>
                            </svg>
                        </button>
                        
                        <input
                            type="text"
                            value={newMessage}
                            onChange={handleTyping}
                            placeholder="Type a message..."
                        />
                        
                        <button type="button">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49"/>
                            </svg>
                        </button>
                    </div>
                    
                    {newMessage.trim() && (
                        <button type="submit">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                            </svg>
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}

export default MessageChat;