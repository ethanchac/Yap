import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../header/Header';
import Sidebar from '../sidebar/Sidebar';
import MessagesList from '../messages/MessagesList';
import MessageChat from '../messages/MessageChat';

function Messages() {
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        fetchConversations();
    }, []);

    // Handle URL parameter for direct conversation access
    useEffect(() => {
        const conversationId = searchParams.get('conversation');
        if (conversationId && conversations.length > 0) {
            // Find and select the conversation from URL parameter
            const conversation = conversations.find(conv => conv._id === conversationId);
            if (conversation) {
                setSelectedConversation(conversation);
            } else {
                // If conversation not found in list, fetch it directly
                fetchSpecificConversation(conversationId);
            }
        }
    }, [searchParams, conversations]);

    const fetchConversations = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/messages/conversations', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setConversations(data.conversations);
            } else {
                console.error('Failed to fetch conversations');
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSpecificConversation = async (conversationId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/messages/conversations/${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedConversation(data.conversation);
                // Also refresh conversations list to include this new one
                fetchConversations();
            } else {
                console.error('Failed to fetch specific conversation');
            }
        } catch (error) {
            console.error('Error fetching specific conversation:', error);
        }
    };

    const handleConversationSelect = (conversation) => {
        setSelectedConversation(conversation);
        // Update URL without causing a page reload
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('conversation', conversation._id);
        window.history.replaceState({}, '', `${window.location.pathname}?${newSearchParams}`);
    };

    const handleNewMessage = (conversationId, message) => {
        // Update conversations list with new message
        setConversations(prev => 
            prev.map(conv => 
                conv._id === conversationId 
                ? { ...conv, last_message: message, last_message_at: message.created_at }
                : conv
            )
        );
    };

    return (
        <>
            <Header />
            <div>
                <Sidebar />
                <div>
                    <div>
                        {/* Left side - Conversations list */}
                        <div>
                            <MessagesList 
                                conversations={conversations}
                                selectedConversation={selectedConversation}
                                onConversationSelect={handleConversationSelect}
                                loading={loading}
                            />
                        </div>
                        
                        {/* Right side - Chat interface */}
                        <div>
                            {selectedConversation ? (
                                <MessageChat 
                                    conversation={selectedConversation}
                                    onNewMessage={handleNewMessage}
                                />
                            ) : (
                                <div>
                                    <div>
                                        <svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                            <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                            <path d="M9 9h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                            <path d="M15 9h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                    </div>
                                    <h2>Your messages</h2>
                                    <p>Send a message to start a chat.</p>
                                    <button>Send message</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

}

export default Messages;