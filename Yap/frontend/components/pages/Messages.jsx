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
        console.log('Conversation ID from URL:', conversationId); // DEBUG
        
        if (conversationId) {
            // Fetch the specific conversation directly
            fetchSpecificConversation(conversationId);
        }
    }, [searchParams]);

    const fetchConversations = async () => {
        try {
            console.log('Fetching conversations...'); // DEBUG
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/messages/conversations', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Conversations response status:', response.status); // DEBUG

            if (response.ok) {
                const data = await response.json();
                console.log('Conversations data:', data); // DEBUG
                setConversations(data.conversations || []);
            } else {
                console.error('Failed to fetch conversations:', response.status);
                const errorData = await response.json();
                console.error('Error data:', errorData);
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSpecificConversation = async (conversationId) => {
        try {
            console.log('Fetching specific conversation:', conversationId); // DEBUG
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/messages/conversations/${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Specific conversation response status:', response.status); // DEBUG

            if (response.ok) {
                const data = await response.json();
                console.log('Specific conversation data:', data); // DEBUG
                
                if (data.success && data.conversation) {
                    setSelectedConversation(data.conversation);
                    
                    // Also refresh conversations list to include this one if it's not there
                    fetchConversations();
                } else {
                    console.error('No conversation in response:', data);
                }
            } else {
                console.error('Failed to fetch specific conversation:', response.status);
                const errorData = await response.json();
                console.error('Error data:', errorData);
                
                // If specific conversation fails, still try to fetch all conversations
                fetchConversations();
            }
        } catch (error) {
            console.error('Error fetching specific conversation:', error);
            // Fallback to fetching all conversations
            fetchConversations();
        }
    };

    const handleConversationSelect = (conversation) => {
        console.log('Selecting conversation:', conversation); // DEBUG
        setSelectedConversation(conversation);
        // Update URL without causing a page reload
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('conversation', conversation._id);
        window.history.replaceState({}, '', `${window.location.pathname}?${newSearchParams}`);
    };

    const handleNewMessage = (conversationId, message) => {
        console.log('New message received:', message); // DEBUG
        // Update conversations list with new message
        setConversations(prev => 
            prev.map(conv => 
                conv._id === conversationId 
                ? { ...conv, last_message: message, last_message_at: message.created_at }
                : conv
            )
        );
    };

    // Debug logging
    useEffect(() => {
        console.log('Current state:');
        console.log('- Loading:', loading);
        console.log('- Conversations count:', conversations.length);
        console.log('- Selected conversation:', selectedConversation ? selectedConversation._id : 'none');
        console.log('- URL conversation param:', searchParams.get('conversation'));
    }, [loading, conversations, selectedConversation, searchParams]);

    return (
        <div className="min-h-screen font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
            <Header />
            <div className="flex h-screen">
                <Sidebar />
                <div className="flex flex-1 h-full ml-64">
                    {/* Left side - Conversations list */}
                    <div className="w-80 border-r border-gray-600 flex flex-col h-full" style={{backgroundColor: '#121212'}}>
                        <MessagesList 
                            conversations={conversations}
                            selectedConversation={selectedConversation}
                            onConversationSelect={handleConversationSelect}
                            loading={loading}
                        />
                    </div>
                    
                    {/* Right side - Chat interface */}
                    <div className="flex-1 flex flex-col h-full" style={{backgroundColor: '#121212'}}>
                        {selectedConversation ? (
                            <MessageChat 
                                conversation={selectedConversation}
                                onNewMessage={handleNewMessage}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <div className="rounded-lg p-8 mb-6" style={{backgroundColor: '#1f2937'}}>
                                    <div className="mb-6">
                                        <svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mx-auto">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                            <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                            <path d="M9 9h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                            <path d="M15 9h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                    </div>
                                    <h2 className="text-white text-2xl font-bold mb-4">Your messages</h2>
                                    <p className="text-gray-400 mb-6">Send a message to start a chat.</p>
                                    <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold transition-colors">
                                        Send message
                                    </button>
                                </div>
                                
                                {/* DEBUG INFO */}
                                <div className="text-xs text-gray-500 space-y-1">
                                    <p className="font-bold">Debug Info:</p>
                                    <p>Loading: {loading.toString()}</p>
                                    <p>Conversations: {conversations.length}</p>
                                    <p>URL Param: {searchParams.get('conversation') || 'none'}</p>
                                    <p>Selected: {selectedConversation ? 'yes' : 'no'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Messages;